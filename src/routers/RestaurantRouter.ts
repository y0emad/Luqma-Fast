import { Router } from "express";
import { MiddleWare } from "../middleware/middleWare";
import { GlobalUtilis } from "../Utilis/GlobalUtilis";
import { RestaurantValidator } from "../validators/RestaurantValidator";
import { RestaurantControllers } from "../controllers/RestaurantControllers";


class RestaurantRouter {
    public router: Router;
    constructor() {
        this.router = Router();
        this.getRoutes();
        this.postRoutes();
        this.patchRoutes();
        // this.deleteRoutes();
    }


    getRoutes() {

        this.router.get('/getNearbyRestaurants', GlobalUtilis.authenticateToken, RestaurantValidator.getNearbyRestaurants(), RestaurantControllers.getNearbyRestaurants, MiddleWare.checkErrors);
        this.router.get('/searchNearbyRestaurants', GlobalUtilis.authenticateToken, RestaurantValidator.searchNearbyRestaurants(), RestaurantControllers.searchNearbyRestaurants, MiddleWare.checkErrors);
        this.router.get('/getRestaurants', GlobalUtilis.authenticateToken, GlobalUtilis.authAdmin, RestaurantControllers.getRestaurants, MiddleWare.checkErrors);


    }
    postRoutes() {
        this.router.post('/createRestaurant', GlobalUtilis.authenticateToken, new GlobalUtilis().upload.single('restaurantImg'), RestaurantValidator.create(), MiddleWare.checkErrors, RestaurantControllers.createRestaurant);

    }
    patchRoutes() {
    }

}

export default new RestaurantRouter().router;