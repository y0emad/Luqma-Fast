
import { decode } from "node:punycode";
import User from "../models/User";
import { GlobalUtilis } from "../Utilis/GlobalUtilis";
import { Jwt } from "../Utilis/Jwt";
import { NodeMailer } from "../Utilis/NodeMailer";
import { Redis } from "../Utilis/Redis";

export class UserControllers {

    static async signup(req: any, res: any, next: any) {
        const { email, name, type, status } = req.body;
        const hashPassword = await GlobalUtilis.hashPassword(req.body.password);
        const otp = GlobalUtilis.generateOtp(6);
        try {
            const user = await new User({
                name: name,
                email: email,
                verification_token: otp,
                verification_time: new Date(Date.now() + GlobalUtilis.timeOfOtpValidity),
                password: hashPassword,
                type: type,
                status: status
            }).save();
            const payload = { aud: user._id, email: user.email, name: user.name, type: user.type };
            const token = Jwt.jwtSign(payload);
            const refreshToken = await Jwt.jwtRefreshSign(payload);
            res.status(201).json({ token, refreshToken, user });
            NodeMailer.sendEmail(email, `Verify your email`, `Your OTP for email verification is ${otp}. It is valid for 5 minutes.`).catch((e) => {
                console.error('Error sending email:', e);
            });
        } catch (e: any) {
            next(e);
        }

    }


    static async verifyEmail(req: any, res: any, next: any) {
        const otp = req.body.otp;
        const email = req.user.email;
        try {
            const user = await User.findOneAndUpdate({ email: email, verification_token: otp, verification_time: { $gt: new Date() } }, { verified: true, verification_token: null, verification_time: null, updated_at: new Date() }, { new: true });
            if (!user) {
                return next({ message: 'Invalid OTP or OTP expired', statusCode: 400 });
            }
            res.status(200).send({ message: 'Email verified successfully' });
        } catch (e) {
            next(e);
        }
    }

    static async resendVerifyEmail(req: any, res: any, next: any) {
        const email = req.user.email;

        const otp = GlobalUtilis.generateOtp(6);
        try {
            const user = await User.findOneAndUpdate({ email: email, verified: false }, { verification_token: otp, verification_time: new Date(Date.now() + GlobalUtilis.timeOfOtpValidity), updated_at: new Date() }, { new: true });

            if (!user) {
                return next({ message: 'User not found or already verified', statusCode: 404 });
            }
            res.status(200).send({ message: 'OTP resent successfully' });
            NodeMailer.sendEmail(email, `Verify your email`, `Your OTP for email verification is ${otp}. It is valid for 5 minutes.`).catch((e) => {
                console.error('Error sending email:', e);
            });
        } catch (e) {
            next(e);
        }
    }

    static async login(req: any, res: any, next: any) {
        const { email, password } = req.query;
        try {
            const user = await User.findOne({ email: email });
            if (!user) {
                return next({ message: 'User not found', statusCode: 404 });
            }
            if (user.type !== "admin" && user.type !== "user") {
                return res.status(401).json("you are not Authorized")

            }
            const isPasswordValid = await GlobalUtilis.comparePassword(password, user.password);
            if (!isPasswordValid) {
                return next({ message: 'Invalid password', statusCode: 400 });
            }
            const payload = { aud: user._id, email: user.email, name: user.name, type: user.type };
            const token = Jwt.jwtSign(payload);
            const refreshToken = await Jwt.jwtRefreshSign(payload);
            res.status(200).json({ token, refreshToken, user });
        } catch (e) {
            next(e);
        }
    }

    static async sendOtpResetPass(req: any, res: any, next: any) {
        const email = req.query.email;
        const otp = GlobalUtilis.generateOtp(6);
        try {
            const user = await User.findOneAndUpdate({ email: email }, { verification_resetPass_token: otp, verification_resetPass_time: new Date(Date.now() + GlobalUtilis.timeOfOtpValidity), updated_at: new Date() });
            if (!user) {
                return next({ message: 'User not found', statusCode: 404 });
            }
            res.status(200).send({ message: 'OTP sent successfully' });
            NodeMailer.sendEmail(email, `Reset your password`, `Your OTP for resetting password is ${otp}. It is valid for 5 minutes.`).catch((e) => {
                console.error('Error sending email:', e);
            });
        } catch (e) {
            next(e);
        }
    }

    static async checkOtpResetPass(req: any, res: any, next: any) {
        const { email, otp } = req.query;
        try {
            const user = await User.findOne({ email: email, verification_resetPass_token: otp, verification_resetPass_time: { $gt: new Date() } });
            if (!user) {
                return next({ message: 'Invalid OTP or OTP expired', statusCode: 400 });
            }
            res.status(200).send({ message: 'success' });
        } catch (e) {
            next(e);
        }
    }

    static async resetPassword(req: any, res: any, next: any) {
        const { email, otp, newPassword } = req.body;

        try {
            const hashPassword = await GlobalUtilis.hashPassword(newPassword);

            const user = await User.findOneAndUpdate({
                email: email,
                verification_resetPass_token: otp, verification_resetPass_time: { $gt: new Date() }
            }, { password: hashPassword, updated_at: new Date(), verification_resetPass_time: null, verification_resetPass_token: null }, { new: true });
            if (!user) {
                return next({ message: 'Invalid OTP or OTP expired', statusCode: 400 });
            }
            res.status(200).send({ message: 'Password reset successfully' });
        } catch (e) {
            next(e);
        }
    }

    static async updateName(req: any, res: any, next: any) {
        const id = req.user.aud;
        const { name } = req.body;
        try {
            const user = await User.findByIdAndUpdate(id, { name: name, updated_at: new Date() }, { new: true });
            if (!user) {
                return next({ message: 'User not found', statusCode: 404 });
            }
            res.status(200).json({ message: 'Name updated successfully', user });
        } catch (e) {
            next(e);
        }
    }

    static async updateProfile(req: any, res: any, next: any) {
        const id = req.user.aud;
        const { name, email, password } = req.body;

        try {
            const isPasswordValid = await GlobalUtilis.comparePassword(password, req.oldUser.password);
            if (!isPasswordValid) {
                return next({ message: 'Invalid password', statusCode: 400 });
            }
            const otp = GlobalUtilis.generateOtp(6);
            await User.findOne({ email: email }).then((user) => {
                if (user) {
                    throw new Error('Email already used by another user');
                }
            })
            const user = await User.findByIdAndUpdate(id, { name: name, email: email, updated_at: new Date(), verified: false, verification_token: otp, verification_time: new Date(Date.now() + GlobalUtilis.timeOfOtpValidity) }, { new: true });
            if (!user) {
                return next({ message: 'User not found', statusCode: 404 });
            }
            const payload = { aud: user._id, email: user.email, name: user.name, type: user.type };
            const token = Jwt.jwtSign(payload);

            res.status(200).json({ message: 'Profile updated successfully', token, user });
            NodeMailer.sendEmail(email, `Verify your email`, `Your email has been updated. Please verify your new email address by using the OTP sent to you. Your OTP is ${user.verification_token}. It is valid for 5 minutes.`).catch((e) => {
                console.error('Error sending email:', e);
            });
        } catch (e) {
            next(e);
        }



    }

    static async newToken(req: any, res: any, next: any) {

        try {
            const decoded: any = req.user

            const payload = { aud: decoded.aud, email: decoded.email, name: decoded.name, type: decoded.type };
            const token = Jwt.jwtSign(payload);
            const newRefreshToken = await Jwt.jwtRefreshSign(payload);
            res.status(200).json({ token, refreshToken: newRefreshToken });
        } catch (e) {
            next(e);
        }
    }
    static async logout(req: any, res: any, next: any) {

        try {
            const decoded: any = req.user
            const userId = JSON.stringify(decoded.aud);
            await Redis.del(userId);
            res.status(200).json({ message: 'Logged out successfully' });
        } catch (e) {
            next(e);
        }
    }

    // add function to ubdatephoto  
        
    static async updatePhoto(req: any, res: any, next: any) {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" })
        }

        const photo = req.file.path
        const userId = req.user.aud

        try {
            const user = await User.findByIdAndUpdate(
                userId,
                { photo: photo },
                { new: true }
            )


            if (!user) {
                return res.status(404).json({ message: "User not found" })
            }

            res.json(user)
        } catch (e) {

            next(e)
        }
    }
}


