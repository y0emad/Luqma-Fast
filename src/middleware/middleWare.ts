import type { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import { AppError } from "../Utilis/AppError";
import { GlobalUtilis } from "../Utilis/GlobalUtilis";

export class MiddleWare {

    // Returns the first validation error. Files multer already saved for this
    // request are deleted, so a rejected request leaves nothing on disk.
    static async checkErrors(req: Request, _res: Response, next: NextFunction) {
        const result = validationResult(req);
        if (result.isEmpty()) return next();

        const files = [
            ...(req.file ? [req.file] : []),
            ...(Array.isArray(req.files) ? req.files : []),
        ];
        await Promise.all(files.map((f) => GlobalUtilis.removeFile(GlobalUtilis.filePath(f))));

        next(new AppError(422, result.array()[0].msg));
    }
}
