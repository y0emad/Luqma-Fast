import type { NextFunction, Request, Response } from "express";
import ContactMessage from "../models/ContactMessage";
import { GlobalUtilis } from "../Utilis/GlobalUtilis";
import { AppError } from "../Utilis/AppError";
import { Jwt } from "../Utilis/Jwt";
import { sendContactNotification } from "../Utilis/NodeMailer";

export class ContactControllers {
    static async create(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, email, subject, message, order_ref } = req.body;
            let userId: string | undefined;
            const auth = req.headers.authorization;
            if (auth?.startsWith('Bearer ')) {
                userId = await Jwt.jwtVerify(auth.slice(7)).then((u) => u.aud).catch(() => undefined);
            }
            const data = await ContactMessage.create({ name, email, subject, message, order_ref, user_id: userId });
            res.status(201).json({ message: 'Message received', status: 201 });

            const to = process.env.ADMIN_EMAIL;
            if (to) void sendContactNotification(to, { name, email, subject, message, orderRef: order_ref, id: String(data._id) });
        } catch (error) {
            next(error);
        }
    }

    static async list(req: Request, res: Response, next: NextFunction) {
        try {
            const filter: Record<string, any> = {};
            if (req.query.unread === 'true') filter.read = false;
            const { page, perPage, skip } = GlobalUtilis.pageParams(req.query, 20);
            const [total, unread, data] = await Promise.all([
                ContactMessage.countDocuments(filter),
                ContactMessage.countDocuments({ read: false }),
                ContactMessage.find(filter).sort({ created_at: -1 }).skip(skip).limit(perPage),
            ]);
            res.status(200).json({ status: 200, data, unread, pagination: GlobalUtilis.pagination(page, perPage, total) });
        } catch (error) {
            next(error);
        }
    }

    static async markRead(req: Request, res: Response, next: NextFunction) {
        try {
            const data = await ContactMessage.findByIdAndUpdate(req.params.id, { read: req.body?.read !== false }, { new: true });
            if (!data) throw new AppError(404, 'Message not found');
            res.status(200).json({ status: 200, data });
        } catch (error) {
            next(error);
        }
    }
}
