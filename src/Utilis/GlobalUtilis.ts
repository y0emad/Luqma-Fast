import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import * as path from 'path';
import { promises as fs } from 'fs';
import Multer from 'multer';
import type { NextFunction, Request, Response } from 'express';
import { Jwt } from './Jwt';
import { AppError } from './AppError';
import User from '../models/User';
import Restaurant from '../models/Restaurant';
const storage = Multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, `./src/uploads/${file.fieldname}`);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + randomInt(1E9)
        const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '')
        cb(null, file.fieldname + '-' + uniqueSuffix + ext)
    }
})

const fileFilter = (req: any, file: any, cb: any) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true);
    } else {
        cb(new AppError(400, 'Invalid file type, only JPEG and PNG are allowed'));
    }
}
export class GlobalUtilis {
    public static timeOfOtpValidity = 5 * 60 * 1000;

    public upload = Multer({ storage: storage, fileFilter: fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

    static generateOtp(digit = 6): string {
        let otp = '';
        for (let i = 0; i < digit; i++) {
            otp += randomInt(10).toString();
        }
        return otp;
    }

    // Stored with forward slashes, so the path works as a URL on every OS.
    static filePath(file: Express.Multer.File): string {
        return file.path.replace(/\\/g, '/');
    }

    static async removeFile(filePath?: string | null) {
        if (!filePath || !filePath.startsWith('src/uploads/')) return;
        await fs.unlink(filePath).catch(() => undefined);
    }

    static pageParams(query: any, perPage = 5) {
        const page = Math.max(parseInt(String(query.page ?? '1'), 10) || 1, 1);
        return { page, perPage, skip: (page - 1) * perPage };
    }

    // The pagination block every list endpoint returns. An empty list is page 1 of 0, not a 404.
    static pagination(page: number, perPage: number, total: number) {
        const totalPages = Math.ceil(total / perPage);
        return {
            page,
            perPage,
            totalPages,
            total,
            nextPage: page < totalPages ? page + 1 : null,
            prevPage: page > 1 ? page - 1 : null,
        };
    }

    static escapeRegex(value: string): string {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    static hashPassword(password: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const saltRounds = 10;
            bcrypt.hash(password, saltRounds, (err, hash) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(hash);
                }
            });
        });
    }

    static comparePassword(password: string, hash: string): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            bcrypt.compare(password, hash, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }



    static authenticateToken(req: Request, _res: Response, next: NextFunction) {
        const authHeader = req.headers['authorization'];
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!token) {
            return next(new AppError(401, 'No token provided'));
        }
        Jwt.jwtVerify(token).then((decoded) => {
            req.user = decoded;
            next();
        }).catch((err: any) => {
            next(new AppError(401, err.message || 'Invalid token'))
        });
    }
    static authenticateRefreshToken(req: Request, _res: Response, next: NextFunction) {
        const { refreshToken } = req.body ?? {};
        if (!refreshToken) {
            return next(new AppError(401, 'No token provided'));
        }
        Jwt.jwtVerifyRefresh(refreshToken).then((decoded) => {
            req.user = decoded;
            next();
        }).catch((err: any) => {
            next(new AppError(401, err.message || 'Invalid refresh token'))
        });
    }

    static authAdmin(req: Request, _res: Response, next: NextFunction) {
        if (req.user?.type === 'admin') return next();
        next(new AppError(403, 'Forbidden: Admins only'));
    }

    // A restaurant account: loads the restaurant it owns into req.restaurant.
    static authRestaurant(req: Request, _res: Response, next: NextFunction) {
        if (req.user?.type !== 'restaurant') return next(new AppError(403, 'Forbidden: restaurant accounts only'));
        Restaurant.findOne({ user_id: req.user.aud }).then((restaurant) => {
            if (!restaurant) return next(new AppError(404, 'No restaurant is linked to this account'));
            req.restaurant = restaurant;
            next();
        }).catch(next);
    }

    static authRestaurantOrAdmin(req: Request, res: Response, next: NextFunction) {
        if (req.user?.type === 'admin') return next();
        GlobalUtilis.authRestaurant(req, res, next);
    }

    // For actions that need a confirmed email, e.g. after changing it in updateProfile.
    static requireVerified(req: Request, _res: Response, next: NextFunction) {
        User.findById(req.user!.aud, { verified: 1, status: 1 }).then((user) => {
            if (!user) return next(new AppError(401, 'User not found'));
            if (!user.verified) return next(new AppError(403, 'Please verify your email first'));
            if (user.status !== 'active') return next(new AppError(403, 'This account is disabled'));
            next();
        }).catch(next);
    }
}
