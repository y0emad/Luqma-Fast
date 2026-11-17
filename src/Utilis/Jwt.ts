import { getEnvironment } from "../environments/environment";
import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { Redis } from "./Redis";

const REFRESH_TTL_SECONDS = 365 * 24 * 60 * 60;
const refreshKey = (userId: string) => `refresh:${userId}`;

export type TokenPayload = Express.AuthUser;

export class Jwt {
    static jwtSign(payload: TokenPayload) {
        return jwt.sign(payload, getEnvironment().tokenSecret, { expiresIn: '1d' })
    }

    static async jwtRefreshSign(payload: TokenPayload) {
        const refreshToken = jwt.sign(payload, getEnvironment().tokenRefreshSecret, { expiresIn: "1y", jwtid: randomUUID() })
        await Redis.setRedis(refreshKey(String(payload.aud)), refreshToken, REFRESH_TTL_SECONDS);
        return refreshToken;
    }

    static jwtVerify(token: string): Promise<TokenPayload> {
        return new Promise((resolve, reject) => {
            jwt.verify(token, getEnvironment().tokenSecret, (err, decoded) => {
                if (err || !decoded || typeof decoded === 'string') {
                    reject(err ?? new Error('Invalid token'));
                } else {
                    resolve(decoded as TokenPayload);
                }
            });
        });
    }

    static async jwtVerifyRefresh(token: string): Promise<TokenPayload> {
        const decoded = await new Promise<TokenPayload>((resolve, reject) => {
            jwt.verify(token, getEnvironment().tokenRefreshSecret, (err, value) => {
                if (err || !value || typeof value === 'string') {
                    reject(err ?? new Error('Invalid token'));
                } else {
                    resolve(value as TokenPayload);
                }
            });
        });
        const stored = await Redis.get(refreshKey(String(decoded.aud)));
        if (stored !== token) {
            throw new Error('Session expired, please log in again');
        }
        return decoded;
    }

    static async revokeRefresh(userId: string) {
        await Redis.del(refreshKey(userId));
    }
}
