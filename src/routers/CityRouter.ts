import { Router } from "express";

import { MiddleWare } from "../middleware/middleWare";
import { GlobalUtilis } from "../Utilis/GlobalUtilis";
import { CityControllers } from "../controllers/CityControllers";
import { CityValidator } from "../validators/CityValidator";

class CityRouter {
    public router: Router;
    constructor() {
        this.router = Router();
        this.getRoutes();
        this.postRoutes();
        this.patchRoutes();
        // this.deleteRoutes();
    }


    getRoutes() {
        this.router.get('/getCities', CityControllers.getCity);



    }
    postRoutes() {
        this.router.post('/createCity', GlobalUtilis.authenticateToken, GlobalUtilis.authAdmin, CityValidator.createCity(), MiddleWare.checkErrors, CityControllers.createCity);

    }
    patchRoutes() {
    }

}

export default new CityRouter().router;