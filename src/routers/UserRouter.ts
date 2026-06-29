import { Router } from "express";
import { UserControllers } from "../controllers/UserControllers";
import { UserValidator } from "../validators/UserValidator";
import { MiddleWare } from "../middleware/middleWare";
import { GlobalUtilis } from "../Utilis/GlobalUtilis";

class UserRouter {
    public router: Router;
    constructor() {
        this.router = Router();
        this.getRoutes();
        this.postRoutes();
        this.patchRoutes();
        this.putRoutes()
        // this.deleteRoutes();
    }


    getRoutes() {
        // this.router.get('/data', UserControllers.getData);

        this.router.get('/login', UserValidator.login(), MiddleWare.checkErrors, UserControllers.login);
        this.router.get('/resendVerifyEmail', GlobalUtilis.authenticateToken, UserControllers.resendVerifyEmail);
        this.router.get('/sendOtpResetPass', UserValidator.sendOtpResetPass(), MiddleWare.checkErrors, UserControllers.sendOtpResetPass);
        this.router.get('/checkOtpResetPass', UserValidator.checkOtpResetPass(), MiddleWare.checkErrors, UserControllers.checkOtpResetPass);



    }
    postRoutes() {
        this.router.post('/signup', UserValidator.signup(), MiddleWare.checkErrors, UserControllers.signup);
        this.router.post('/newToken', GlobalUtilis.authenticateRefreshToken, UserControllers.newToken);
        this.router.post('/logout', GlobalUtilis.authenticateToken, GlobalUtilis.authenticateRefreshToken, UserControllers.logout);

    }
    patchRoutes() {
        this.router.patch('/verifyEmail', GlobalUtilis.authenticateToken, UserValidator.verifyEmail(), MiddleWare.checkErrors, UserControllers.verifyEmail);
        this.router.patch('/resetpassword', UserValidator.resetPassword(), MiddleWare.checkErrors, UserControllers.resetPassword);
        this.router.patch('/updateName', GlobalUtilis.authenticateToken, UserValidator.updateName(), MiddleWare.checkErrors, UserControllers.updateName);
        this.router.patch('/updateProfile', GlobalUtilis.authenticateToken, UserValidator.updateProfile(), MiddleWare.checkErrors, UserControllers.updateProfile);
    }
    putRoutes() {
        this.router.put('/updatePhoto', GlobalUtilis.authenticateToken, new GlobalUtilis().upload.single("photoUser"), UserValidator.updatePhoto(), MiddleWare.checkErrors, UserControllers.updatePhoto)
    }

}

export default new UserRouter().router;