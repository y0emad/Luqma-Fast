import { Router } from "express";

import { MiddleWare } from "../middleware/middleWare";
import { GlobalUtilis } from "../Utilis/GlobalUtilis";
import { BannerControllers } from "../controllers/BannerControllers";
import { BannerValidator } from "../validators/BannerValidator";

class BannerRouter {
    public router: Router;
    constructor() {
        this.router = Router();
        this.getRoutes();
        this.postRoutes();
        this.patchRoutes();
        // this.deleteRoutes();
    }


    getRoutes() {
        this.router.get('/getBanners', BannerControllers.getBanner);



    }
    postRoutes() {
        this.router.post('/addOneBanner', GlobalUtilis.authenticateToken, GlobalUtilis.authAdmin, new GlobalUtilis().upload.single('banner'), BannerValidator.addBanner(), MiddleWare.checkErrors, BannerControllers.addBanner);
        this.router.post('/addManyBanner', GlobalUtilis.authenticateToken, GlobalUtilis.authAdmin, new GlobalUtilis().upload.array('banner', 5), BannerValidator.addManyBanner(), MiddleWare.checkErrors, BannerControllers.addManyBanner);

    }
    patchRoutes() {
    }

}

export default new BannerRouter().router;