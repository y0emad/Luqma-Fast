import { Router } from "express";
import { body, param } from "express-validator";
import Restaurant from "../models/Restaurant";
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
        this.router.get('/getCategories/:restaurant_id', GlobalUtilis.authenticateToken, GlobalUtilis.authAdmin, param('restaurant_id', 'Restaurant ID is invalid').isMongoId(), MiddleWare.checkErrors, CategoryControllers.getCategory);



    }
    postRoutes() {
        this.router.post('/createCategory', GlobalUtilis.authenticateToken, GlobalUtilis.authAdmin,
            body('restaurant_id', 'Restaurant ID is invalid').isMongoId().bail().custom(async (value) => {
                if (!(await Restaurant.exists({ _id: value }))) throw new Error('Restaurant not found');
            }),
            body('name', 'Category name is required').isString().trim().isLength({ min: 1, max: 60 }),
            MiddleWare.checkErrors, CategoryControllers.createCategory);
    }
    patchRoutes() {
    }

}

export default new CategoryRouter().router;