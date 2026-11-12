import { Router } from "express";

import { MiddleWare } from "../middleware/middleWare";
import { GlobalUtilis } from "../Utilis/GlobalUtilis";

import { AddressControllers } from "../controllers/AdressControllers";
import { AddressValidator } from "../validators/AddressValidator";

class AddressRouter {
    public router: Router;
    constructor() {
        this.router = Router();
        this.getRoutes();
        this.postRoutes();
        this.patchRoutes();
        this.deleteRoutes();
    }


    getRoutes() {
        this.router.get('/getAddresses', GlobalUtilis.authenticateToken,AddressValidator.getAddresses(), MiddleWare.checkErrors, AddressControllers.getAddress);
        this.router.get('/getAddressesLimit', GlobalUtilis.authenticateToken, AddressValidator.getAddressesLimit(), MiddleWare.checkErrors, AddressControllers.getAddressLimit);
        this.router.get('/getAddress/:AddressId', GlobalUtilis.authenticateToken, AddressValidator.getAddressById(), MiddleWare.checkErrors, AddressControllers.getAddressById);
        this.router.get('/checkAddress', GlobalUtilis.authenticateToken, AddressValidator.checkAddress(), MiddleWare.checkErrors, AddressControllers.checkAddress);



    }
    postRoutes() {
        this.router.post('/createAddress', GlobalUtilis.authenticateToken, GlobalUtilis.requireVerified, AddressValidator.createAddress(), MiddleWare.checkErrors, AddressControllers.createAddress);

    }
    patchRoutes() {
        this.router.patch('/updateAddress/:id', GlobalUtilis.authenticateToken,AddressValidator.updateAddress(), MiddleWare.checkErrors, AddressControllers.updateAddress);
    }
    deleteRoutes() {
        this.router.delete('/deleteAddress/:id', GlobalUtilis.authenticateToken,AddressValidator.deleteAddress(), MiddleWare.checkErrors, AddressControllers.deleteAddress);
    }

}

export default new AddressRouter().router;