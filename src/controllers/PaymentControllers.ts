import type { NextFunction, Request, Response } from "express";
import { getEnvironment } from "../environments/environment";
import { isValidHmac, redirectHmacValues, transactionHmacValues } from "../Utilis/Paymob";
import { fromRedirect, fromWebhook, processTransaction } from "../services/PaymentService";
import Payment from "../models/Payment";

export class PaymentControllers {
    static async paymobWebhook(req: Request, res: Response, next: NextFunction) {
        try {
            const body = req.body ?? {};
            if (body.type !== "TRANSACTION" || !body.obj) {
                return res.status(200).json({ received: true, ignored: true });
            }
            if (!isValidHmac(transactionHmacValues(body.obj), req.query.hmac)) {
                console.warn("Paymob webhook with an invalid HMAC was rejected");
                return res.status(401).json({ message: "Invalid signature", status: 401 });
            }
            const result = await processTransaction(fromWebhook(body.obj));
            res.status(200).json({ received: true, ...result });
        } catch (error) {
            next(error);
        }
    }

    static async paymobReturn(req: Request, res: Response, next: NextFunction) {
        try {
            const frontend = getEnvironment().frontendUrls[0];
            const query = req.query as Record<string, any>;
            if (!isValidHmac(redirectHmacValues(query), query.hmac)) {
                return res.redirect(302, `${frontend}/orders?payment=invalid`);
            }
            const t = fromRedirect(query);
            const result = await processTransaction(t);
            const orderId = result.orderId
                ?? (t.paymobOrderId ? String((await Payment.findOne({ paymob_order_id: t.paymobOrderId }))?.order_id ?? "") : "");
            const outcome = t.success && !t.pending ? "success" : t.pending ? "pending" : "failed";
            res.redirect(302, `${frontend}/orders/${orderId}?payment=${outcome}`);
        } catch (error) {
            next(error);
        }
    }
}
