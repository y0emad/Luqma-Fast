import { getEnvironment } from "../environments/environment";
import * as jwt from 'jsonwebtoken';
import { Redis } from "./Redis";

export class Jwt {
    static jwtSign(payload: any) {
        return jwt.sign(payload, getEnvironment().token_secret, { expiresIn: '1d' })
    }




    static async jwtRefreshSign(payload: any, exRedis: number = 500) {
        try {
            const refreshToken: string = jwt.sign(payload, getEnvironment().token_refresh_secret, { expiresIn: "1y" })
            const userId = JSON.stringify(payload.aud);
            Redis.setRedis(userId, refreshToken, exRedis);
            return refreshToken;
        }
        catch (err) {
            throw (err);
        }
    }

    static jwtVerify(token: string) {
        return new Promise((resolve, reject) => {
            jwt.verify(token, getEnvironment().token_secret, (err, decoded) => {
                if (err) {
                    reject(err);
                } else if (!decoded) {
                    reject(new Error('Invalid token'));
                } else {
                    resolve(decoded);
                }
            });
        });
    }
    static async jwtVerifyRefresh(token: string) {
        try {
            return await new Promise((resolve, reject) => {
                jwt.verify(token, getEnvironment().token_refresh_secret, (err, decoded: any) => {
                    if (err) {
                        return reject(err);
                    }
                    if (!decoded) {
                        return reject(new Error(' Invalid token'));
                    }

                    const userId = JSON.stringify(decoded.aud)


                    Redis.get(userId).then((refreshToken) => {
                        if (refreshToken !== token) {
                            reject(new Error('token expires login again'));
                        } else {
                            resolve(decoded);
                        }
                    }).catch(reject);
                });
            });
        } catch (err) {
            throw err;
        }
    }
}