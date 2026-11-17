import { Router } from "express";
import { MiddleWare } from "../middleware/middleWare";
import { GlobalUtilis } from "../Utilis/GlobalUtilis";
import { OrderControllers } from "../controllers/OrderControllers";
import { OrderValidator } from "../validators/OrderValidator";

class OrderRouter {
    public router: Router;
    constructor() {
        this.router = Router();
        this.getRoutes();
        this.postRoutes();
        this.patchRoutes();
    }

    getRoutes() {
        this.router.get('/getOrders', GlobalUtilis.authenticateToken, OrderValidator.getOrders(), MiddleWare.checkErrors, OrderControllers.getOrder);
        this.router.get('/:id/payments', GlobalUtilis.authenticateToken, OrderValidator.orderId(), MiddleWare.checkErrors, OrderControllers.getPayments);
        this.router.get('/:id', GlobalUtilis.authenticateToken, OrderValidator.orderId(), MiddleWare.checkErrors, OrderControllers.getOrderById);
    }

    postRoutes() {
        this.router.post('/:id/review', GlobalUtilis.authenticateToken, OrderValidator.review(), MiddleWare.checkErrors, OrderControllers.reviewOrder);
        this.router.post('/:id/pay', GlobalUtilis.authenticateToken, OrderValidator.payOrder(), MiddleWare.checkErrors, OrderControllers.payOrder);
        this.router.post('/createOrder', GlobalUtilis.authenticateToken, GlobalUtilis.requireVerified, OrderValidator.createOrder(), MiddleWare.checkErrors, OrderControllers.createOrder);
    }

    patchRoutes() {
        this.router.patch('/:id/cancel', GlobalUtilis.authenticateToken, OrderValidator.cancelOrder(), MiddleWare.checkErrors, OrderControllers.cancelOrder);
        this.router.patch('/:id/status', GlobalUtilis.authenticateToken, GlobalUtilis.authRestaurantOrAdmin, OrderValidator.updateStatus(), MiddleWare.checkErrors, OrderControllers.updateStatus);
    }
}

export default new OrderRouter().router;
