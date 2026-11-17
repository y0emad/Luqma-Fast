import { Router } from "express";
import { UserControllers } from "../controllers/UserControllers";
import { UserValidator } from "../validators/UserValidator";
import { MiddleWare } from "../middleware/middleWare";
import { GlobalUtilis } from "../Utilis/GlobalUtilis";
import { authLimiter, otpLimiter } from "../middleware/rateLimit";

class UserRouter {
    public router: Router;
    constructor() {
        this.router = Router();
        this.getRoutes();
        this.postRoutes();
        this.patchRoutes();
        this.putRoutes();
    }

    getRoutes() {
        this.router.get('/me', GlobalUtilis.authenticateToken, UserControllers.me);
    }

    postRoutes() {
        this.router.post('/signup', authLimiter, UserValidator.signup(), MiddleWare.checkErrors, UserControllers.signup);
        this.router.post('/login', authLimiter, UserValidator.login(), MiddleWare.checkErrors, UserControllers.login);
        this.router.post('/verifyEmail', otpLimiter, UserValidator.verifyEmail(), MiddleWare.checkErrors, UserControllers.verifyEmail);
        this.router.post('/resendVerifyEmail', otpLimiter, UserValidator.resendVerifyEmail(), MiddleWare.checkErrors, UserControllers.resendVerifyEmail);
        this.router.post('/sendOtpResetPass', otpLimiter, UserValidator.sendOtpResetPass(), MiddleWare.checkErrors, UserControllers.sendOtpResetPass);
        this.router.post('/checkOtpResetPass', otpLimiter, UserValidator.checkOtpResetPass(), MiddleWare.checkErrors, UserControllers.checkOtpResetPass);
        this.router.post('/newToken', UserValidator.newToken(), MiddleWare.checkErrors, GlobalUtilis.authenticateRefreshToken, UserControllers.newToken);
        this.router.post('/logout', GlobalUtilis.authenticateToken, UserControllers.logout);
    }

    patchRoutes() {
        this.router.patch('/resetpassword', otpLimiter, UserValidator.resetPassword(), MiddleWare.checkErrors, UserControllers.resetPassword);
        this.router.patch('/updateName', GlobalUtilis.authenticateToken, UserValidator.updateName(), MiddleWare.checkErrors, UserControllers.updateName);
        this.router.patch('/updateProfile', GlobalUtilis.authenticateToken, UserValidator.updateProfile(), MiddleWare.checkErrors, UserControllers.updateProfile);
    }

    putRoutes() {
        this.router.put('/updatePhoto', GlobalUtilis.authenticateToken, new GlobalUtilis().upload.single("photoUser"), UserValidator.updatePhoto(), MiddleWare.checkErrors, UserControllers.updatePhoto);
    }
}

export default new UserRouter().router;
