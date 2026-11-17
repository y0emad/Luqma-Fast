import { Router } from "express";
import { MiddleWare } from "../middleware/middleWare";
import { GlobalUtilis } from "../Utilis/GlobalUtilis";
import { ItemsValidator } from "../validators/ItemsValidator";
import { ItemsControllers } from "../controllers/ItemsControllers";


class ItemsRouter {
    public router: Router;
    constructor() {
        this.router = Router();
        this.getRoutes();
        this.postRoutes();
        this.patchRoutes();
        // this.deleteRoutes();
    }


    getRoutes() {
        this.router.get('/getItems', ItemsControllers.getItems);
        this.router.get('/getMenu/:restaurantId', ItemsValidator.getMenu(), MiddleWare.checkErrors, ItemsControllers.getMenu);



    }
    postRoutes() {
        this.router.post('/createItems', GlobalUtilis.authenticateToken, GlobalUtilis.authAdmin, new GlobalUtilis().upload.single('ItemsImg'), ItemsValidator.CreateItems(), MiddleWare.checkErrors, ItemsControllers.createItem);

    }
    patchRoutes() {
    }

}

export default new ItemsRouter().router;