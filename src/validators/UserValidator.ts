import { body } from "express-validator"

const email = () => body('email', 'A valid email is required').isEmail().trim().toLowerCase();
const otp = () => body('otp', 'OTP must be 6 digits').isString().matches(/^\d{6}$/);
const password = (field = 'password') =>
    body(field, 'Password must be at least 8 characters long').isString().isLength({ min: 8, max: 72 });

export class UserValidator {

    static signup() {
        return [
            email(),
            password(),
            body('name', 'Name must be between 2 and 100 characters long').isString().trim().isLength({ min: 2, max: 100 }),
        ]
    }

    static verifyEmail() {
        return [email(), otp()]
    }

    static resendVerifyEmail() {
        return [email()]
    }

    static login() {
        return [
            email(),
            body('password', 'Password is required').isString().notEmpty()
        ]
    }

    static sendOtpResetPass() {
        return [email()]
    }

    static checkOtpResetPass() {
        return [email(), otp()]
    }

    static resetPassword() {
        return [email(), otp(), password('newPassword')]
    }

    static updateName() {
        return [
            body('name', 'Name must be between 2 and 100 characters long').isString().trim().isLength({ min: 2, max: 100 })
        ]
    }

    static updateProfile() {
        return [
            body('name', 'Name must be between 2 and 100 characters long').isString().trim().isLength({ min: 2, max: 100 }),
            email(),
            body('password', 'Your current password is required').isString().notEmpty()
        ]
    }

    static newToken() {
        return [
            body('refreshToken', 'Refresh token is required').isString().notEmpty()
        ]
    }

    static updatePhoto() {
        return [
            body('photoUser').custom((_value, { req }) => {
                if (!req.file) {
                    throw new Error('Photo file is required');
                }
                return true;
            })
        ]
    }
}
