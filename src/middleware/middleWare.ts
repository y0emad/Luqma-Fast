import { validationResult } from "express-validator";

export class MiddleWare {

    static checkErrors(req: any, res: any, next: any) {
        const result = validationResult(req);

        if (!result.isEmpty()) {
            return next({ message: result.array()[0].msg, statusCode: 422 });
        }
        else
            next();

    }
}