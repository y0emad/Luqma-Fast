import * as bcrypt from 'bcrypt';
import Multer from 'multer';
import { Jwt } from './Jwt';
const storage = Multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, `./src/uploads/${file.fieldname}`);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname)
    }
})

const fileFilter = (req: any, file: any, cb: any) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type, only JPEG and PNG is allowed!'), false);
    }
}
export class GlobalUtilis {
    public static timeOfOtpValidity = 5 * 60 * 1000;

    public upload = Multer({ storage: storage, fileFilter: fileFilter });

    static generateOtp(digit = 6): number {
        const digits = '0123456789';
        let otp = '';
        for (let i = 0; i < 6; i++) {
            otp += digits[Math.floor(Math.random() * 10)];
        }
        return parseInt(otp);
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
                if (!result) {
                    reject(new Error('password does not match'));
                } else {
                    resolve(result);
                }
            });
        });
    }



    static authenticateToken(req: any, res: any, next: any) {
        const authHeader = req.headers['authorization'];
        const token = authHeader ? authHeader.split(' ')[1] : null;
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }
        Jwt.jwtVerify(token).then((decoded: any) => {
            req.user = decoded;
            next();
        }).catch((err: any) => {
            next(err)
        });
    }
    static async authenticateRefreshToken(req: any, res: any, next: any) {
        const { refreshToken } = req.body

        if (!refreshToken) {
            return res.status(401).json({ message: 'No token provided' });
        }

        Jwt.jwtVerifyRefresh(refreshToken).then((decoded: any) => {
            req.user = decoded;
            next();
        }).catch((err: any) => {
            next(err)
        });
    }



    static authAdmin(req: any, res: any, next: any) {
        if (req.user && req.user.type === 'admin') {
            next();
        } else {
            res.status(403).json({ message: 'Forbidden: Admins only' });
        }
    }
}