import { Router } from "express";
import { MiddleWare } from "../middleware/middleWare";
import { CategoryControllers } from "../controllers/CategoryControllers";
import { GlobalUtilis } from "../Utilis/GlobalUtilis";


class CategoryRouter {
    public router: Router;
    constructor() {
        this.router = Router();
        this.getRoutes();
        this.postRoutes();
        this.patchRoutes();
        // this.deleteRoutes();
    }


    getRoutes() {
        this.router.get('/getCategories/:restaurant_id',GlobalUtilis.authenticateToken,GlobalUtilis.authAdmin, CategoryControllers.getCategory , MiddleWare.checkErrors);



    }
    postRoutes() {

    }
    patchRoutes() {
    }

}

export default new CategoryRouter().router;