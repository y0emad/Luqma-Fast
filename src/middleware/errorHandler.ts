import type { NextFunction, Request, Response } from "express";
import { AppError } from "../Utilis/AppError";

const DUPLICATE_MESSAGES: Record<string, string> = {
    email: "This email is already registered",
};

export function notFound(req: Request, res: Response) {
    res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found`, status: 404 });
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
    const send = (status: number, message: string) => res.status(status).json({ message, status });

    if (err instanceof AppError) {
        return send(err.statusCode, err.message);
    }

    // Legacy style: next({ message, statusCode }) from older code paths.
    if (err && typeof err.statusCode === "number" && err.statusCode < 500) {
        return send(err.statusCode, err.message);
    }

    // Mongo duplicate key (unique index), e.g. an email that is already used.
    if (err?.code === 11000) {
        const field = Object.keys(err.keyPattern ?? err.keyValue ?? {})[0];
        return send(409, DUPLICATE_MESSAGES[field] ?? "This record already exists");
    }

    // A malformed ObjectId or a value Mongoose can't cast.
    if (err?.name === "CastError") {
        return send(400, `Invalid value for ${err.path}`);
    }

    if (err?.name === "ValidationError") {
        const first = Object.values(err.errors ?? {})[0] as any;
        return send(400, first?.message ?? "Invalid data");
    }

    if (err?.type === "entity.parse.failed") {
        return send(400, "Invalid JSON body");
    }

    if (err?.type === "entity.too.large") {
        return send(413, "Request body is too large");
    }

    if (err?.name === "MulterError") {
        return send(400, err.code === "LIMIT_FILE_SIZE" ? "File is too large (max 5MB)" : err.message);
    }

    // Anything else: log the real cause, answer with a generic message.
    console.error(err);
    return send(500, "Something went wrong, please try again");
}
