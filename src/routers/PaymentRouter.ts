import { Router } from "express";
import { PaymentControllers } from "../controllers/PaymentControllers";

// /api/payments: called by Paymob (webhook) and by the customer's browser coming back
// from Paymob (return). Mounted before the API rate limit, and without auth: they are
// authenticated by their HMAC signature instead.
class PaymentRouter {
    public router: Router;
    constructor() {
        this.router = Router();
        this.router.post('/paymob/webhook', PaymentControllers.paymobWebhook);
        this.router.get('/paymob/return', PaymentControllers.paymobReturn);
    }
}

export default new PaymentRouter().router;
