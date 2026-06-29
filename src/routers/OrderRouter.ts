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
        this.deleteRoutes();
    }


    getRoutes() {
        this.router.get('/getOrders', GlobalUtilis.authenticateToken, OrderControllers.getOrder);


    }
    postRoutes() {
        this.router.post('/createOrder', GlobalUtilis.authenticateToken, OrderValidator.createOrder(), MiddleWare.checkErrors, OrderControllers.createOrder);

    }
    patchRoutes() {
    }
    deleteRoutes() {
    }

}

export default new OrderRouter().router;