import { GlobalUtilis } from "./GlobalUtilis";
import { AppError } from "./AppError";

export const OTP_VALIDITY_MS = 10 * 60 * 1000;
export const MAX_OTP_ATTEMPTS = 5;

const FIELDS = {
    verify: { token: 'verification_token', time: 'verification_time', attempts: 'verification_attempts' },
    reset: { token: 'verification_resetPass_token', time: 'verification_resetPass_time', attempts: 'verification_resetPass_attempts' },
} as const;

export type OtpKind = keyof typeof FIELDS;

export async function issueOtp(kind: OtpKind) {
    const otp = GlobalUtilis.generateOtp(6);
    const f = FIELDS[kind];
    return {
        otp,
        update: {
            [f.token]: await GlobalUtilis.hashPassword(otp),
            [f.time]: new Date(Date.now() + OTP_VALIDITY_MS),
            [f.attempts]: 0,
        },
    };
}

export function clearOtp(kind: OtpKind) {
    const f = FIELDS[kind];
    return { [f.token]: null, [f.time]: null, [f.attempts]: 0 };
}

export async function assertOtp(user: any, kind: OtpKind, otp: string) {
    const f = FIELDS[kind];
    const hash: string | undefined = user?.[f.token];
    const expires: Date | undefined = user?.[f.time];
    if (!user || !hash || !expires || expires.getTime() < Date.now()) {
        throw new AppError(400, 'Invalid OTP or OTP expired');
    }
    if ((user[f.attempts] ?? 0) >= MAX_OTP_ATTEMPTS) {
        throw new AppError(429, 'Too many wrong attempts, please request a new code');
    }
    const ok = await GlobalUtilis.comparePassword(String(otp), hash);
    if (!ok) {
        await user.updateOne({ $inc: { [f.attempts]: 1 } });
        throw new AppError(400, 'Invalid OTP or OTP expired');
    }
}
