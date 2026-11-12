import { Router } from "express";
import { PaymentControllers } from "../controllers/PaymentControllers";

class PaymentRouter {
    public router: Router;
    constructor() {
        this.router = Router();
        this.router.post('/paymob/webhook', PaymentControllers.paymobWebhook);
        this.router.get('/paymob/return', PaymentControllers.paymobReturn);
    }
}

export default new PaymentRouter().router;
