export interface Environment {
    port: number;
    nodeEnv: string;
    mongoUri: string;
    redisUrl: string;
    tokenSecret: string;
    tokenRefreshSecret: string;
    frontendUrls: string[];
    trustProxy: boolean;
}

const REQUIRED = ["MONGO_URI", "REDIS_URL", "JWT_SECRET", "JWT_REFRESH_SECRET"] as const;

export function assertEnvironment() {
    const missing = REQUIRED.filter((key) => !process.env[key]);
    if (missing.length) {
        throw new Error(`Missing environment variables: ${missing.join(", ")}`);
    }
    for (const key of ["JWT_SECRET", "JWT_REFRESH_SECRET"] as const) {
        if (process.env[key]!.length < 32) {
            throw new Error(`${key} must be at least 32 characters`);
        }
    }
    if (process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
        throw new Error("JWT_SECRET and JWT_REFRESH_SECRET must be different");
    }
}

export function getEnvironment(): Environment {
    return {
        port: Number(process.env.PORT) || 3000,
        nodeEnv: process.env.NODE_ENV ?? "development",
        mongoUri: process.env.MONGO_URI!,
        redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
        tokenSecret: process.env.JWT_SECRET!,
        tokenRefreshSecret: process.env.JWT_REFRESH_SECRET!,
        frontendUrls: (process.env.FRONTEND_URL ?? "http://localhost:5173").split(",").map((o) => o.trim()),
        trustProxy: process.env.TRUST_PROXY === "true",
    };
}
