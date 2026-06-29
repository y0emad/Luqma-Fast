import { body, query } from "express-validator"
import User from "../models/User"

export class UserValidator {

    static signup() {
        return [
            body('email', 'Email is required').isEmail().custom((value) => {

                return User.findOne({ email: value }).then((user) => {
                    if (user) {
                        throw new Error('Email already exists');
                    }
                }).catch((e) => {
                    throw new Error(e);
                });
            }),
            body('password', 'Password is required').isString().isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
            body('name', 'Name is required').isString().withMessage('Name is required'),
            body('type', 'Type is required').isString()



        ]

    }


    static verifyEmail() {
        return [

            body('otp', 'OTP is required').isString()
        ]
    }


    static login() {
        return [
            query('email', 'Email is required').isEmail(),
            query('password', 'Password is required').isString().isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
        ]
    }

    static sendOtpResetPass() {
        return [
            query('email', 'Email is required').isEmail()
            // .custom((value) => {

            //     const user = User.findOne({ email: value }).then((user) => {
            //         if (!user) {
            //             throw new Error('Email does not exist');
            //         }
            //     return user;
            //     }).catch((e) => {
            //         throw new Error(e);
            //     });
            // }
        ]
    }

    static checkOtpResetPass() {
        return [
            query('email', 'Email is required').isEmail(),
            query('otp', 'OTP is required').isString()
        ]
    }

    static resetPassword() {
        return [
            body('email', 'Email is required').isEmail(),
            body('otp', 'OTP is required').isString(),
            body('newPassword', 'New password is required').isString().isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
        ]
    }

    static updateName() {
        return [
            body('name', 'Name is required').isString().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters long')
        ]
    }

    static updateProfile() {
        return [
            body('name', 'Name is required').isString().withMessage('Name is required'),
            body('email', 'Email is required').isEmail().custom((value, { req }) => {

                return User.findById(req.user.aud).then((user: any) => {
                    if (user.email === value) {
                        throw new Error('Email already used before');
                    }
                    else {
                        return req.oldUser = user;
                    }

                }).catch((e) => {
                    throw new Error(e);
                });
            }),
            body('password', 'Password is required')

        ]
    }


    static newToken() {
        return [
            body('refreshToken', 'Refresh token is required').isString().custom((value) => {
                if (!value) {

                    throw new Error('Refresh token is required');
                } else
                    return value;
            })
        ]
    }


    static updatePhoto() {
        return [
            body('photoUser', "photo is required").custom((value, { req }) => {
                if (!req.file) {
                    throw new Error('Banner file is required');
                }
                return true;
            })
        ]
    }
}