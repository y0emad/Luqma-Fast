import type { NextFunction, Request, Response } from "express";
import User from "../models/User";
import { GlobalUtilis } from "../Utilis/GlobalUtilis";
import { Jwt, type TokenPayload } from "../Utilis/Jwt";
import { sendResetPasswordEmail, sendVerifyEmail } from "../Utilis/NodeMailer";
import { AppError } from "../Utilis/AppError";
import { assertOtp, clearOtp, issueOtp } from "../Utilis/Otp";

const payloadOf = (user: any): TokenPayload =>
    ({ aud: String(user._id), email: user.email, name: user.name, type: user.type });

async function issueTokens(user: any) {
    const payload = payloadOf(user);
    return { token: Jwt.jwtSign(payload), refreshToken: await Jwt.jwtRefreshSign(payload) };
}

export class UserControllers {

    static async signup(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, name, password } = req.body;
            if (await User.exists({ email })) {
                throw new AppError(409, 'This email is already registered');
            }
            const { otp, update } = await issueOtp('verify');
            const user = await User.create({
                name,
                email,
                password: await GlobalUtilis.hashPassword(password),
                type: 'user',
                ...update,
            });
            try {
                await sendVerifyEmail(email, otp);
            } catch (e) {
                await User.deleteOne({ _id: user._id });
                throw e;
            }
            res.status(201).json({ message: 'Account created, check your email for the verification code', status: 201, user });
        } catch (e) {
            next(e);
        }
    }

    static async verifyEmail(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, otp } = req.body;
            const user = await User.findOne({ email, verified: false });
            await assertOtp(user, 'verify', otp);
            await user!.updateOne({ verified: true, ...clearOtp('verify') });
            const tokens = await issueTokens(user);
            res.status(200).json({ message: 'Email verified successfully', status: 200, ...tokens, user: { ...user!.toJSON(), verified: true } });
        } catch (e) {
            next(e);
        }
    }

    static async resendVerifyEmail(req: Request, res: Response, next: NextFunction) {
        try {
            const { email } = req.body;
            const user = await User.findOne({ email, verified: false });
            if (user) {
                const { otp, update } = await issueOtp('verify');
                await user.updateOne(update);
                await sendVerifyEmail(email, otp);
            }
            res.status(200).json({ message: 'If this account needs verification, a new code was sent', status: 200 });
        } catch (e) {
            next(e);
        }
    }

    static async login(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, password } = req.body;
            const user = await User.findOne({ email });
            const isPasswordValid = user ? await GlobalUtilis.comparePassword(password, user.password) : false;
            if (!user || !isPasswordValid) {
                throw new AppError(401, 'Invalid email or password');
            }
            if (!user.verified) {
                throw new AppError(403, 'Please verify your email first');
            }
            if (user.status !== 'active') {
                throw new AppError(403, 'This account is disabled');
            }
            res.status(200).json({ ...(await issueTokens(user)), user });
        } catch (e) {
            next(e);
        }
    }

    static async me(req: Request, res: Response, next: NextFunction) {
        try {
            const user = await User.findById(req.user!.aud);
            if (!user) throw new AppError(404, 'User not found');
            res.status(200).json({ status: 200, user });
        } catch (e) {
            next(e);
        }
    }

    static async sendOtpResetPass(req: Request, res: Response, next: NextFunction) {
        try {
            const { email } = req.body;
            const user = await User.findOne({ email });
            if (user) {
                const { otp, update } = await issueOtp('reset');
                await user.updateOne(update);
                await sendResetPasswordEmail(email, otp);
            }
            res.status(200).json({ message: 'If this email is registered, a reset code was sent', status: 200 });
        } catch (e) {
            next(e);
        }
    }

    static async checkOtpResetPass(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, otp } = req.body;
            await assertOtp(await User.findOne({ email }), 'reset', otp);
            res.status(200).json({ message: 'success', status: 200 });
        } catch (e) {
            next(e);
        }
    }

    static async resetPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, otp, newPassword } = req.body;
            const user = await User.findOne({ email });
            await assertOtp(user, 'reset', otp);
            await user!.updateOne({ password: await GlobalUtilis.hashPassword(newPassword), ...clearOtp('reset') });
            await Jwt.revokeRefresh(String(user!._id));
            res.status(200).json({ message: 'Password reset successfully', status: 200 });
        } catch (e) {
            next(e);
        }
    }

    static async updateName(req: Request, res: Response, next: NextFunction) {
        try {
            const user = await User.findByIdAndUpdate(req.user!.aud, { name: req.body.name }, { new: true });
            if (!user) throw new AppError(404, 'User not found');
            res.status(200).json({ message: 'Name updated successfully', status: 200, user });
        } catch (e) {
            next(e);
        }
    }

    static async updateProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, email, password } = req.body;
            const current = await User.findById(req.user!.aud);
            if (!current) throw new AppError(404, 'User not found');
            if (!(await GlobalUtilis.comparePassword(password, current.password))) {
                throw new AppError(400, 'Invalid password');
            }
            if (email === current.email) {
                const user = await User.findByIdAndUpdate(current._id, { name }, { new: true });
                return res.status(200).json({ message: 'Profile updated successfully', status: 200, user });
            }
            if (await User.exists({ email })) {
                throw new AppError(409, 'This email is already registered');
            }
            const { otp, update } = await issueOtp('verify');
            await sendVerifyEmail(email, otp);
            const user = await User.findByIdAndUpdate(current._id, { name, email, verified: false, ...update }, { new: true });
            await Jwt.revokeRefresh(String(current._id));
            res.status(200).json({ message: 'Profile updated, verify your new email to log in again', status: 200, user });
        } catch (e) {
            next(e);
        }
    }

    static async newToken(req: Request, res: Response, next: NextFunction) {
        try {
            const user = await User.findById(req.user!.aud);
            if (!user || user.status !== 'active' || !user.verified) {
                throw new AppError(401, 'Session expired, please log in again');
            }
            res.status(200).json(await issueTokens(user));
        } catch (e) {
            next(e);
        }
    }

    static async logout(req: Request, res: Response, next: NextFunction) {
        try {
            await Jwt.revokeRefresh(req.user!.aud);
            res.status(200).json({ message: 'Logged out successfully', status: 200 });
        } catch (e) {
            next(e);
        }
    }

    static async updatePhoto(req: Request, res: Response, next: NextFunction) {
        try {
            const photo = GlobalUtilis.filePath(req.file!);
            const old = await User.findByIdAndUpdate(req.user!.aud, { photo });
            if (!old) {
                await GlobalUtilis.removeFile(photo);
                throw new AppError(404, 'User not found');
            }
            await GlobalUtilis.removeFile(old.photo);
            res.status(200).json({ message: 'Photo updated successfully', status: 200, user: { ...old.toJSON(), photo } });
        } catch (e) {
            next(e);
        }
    }
}
