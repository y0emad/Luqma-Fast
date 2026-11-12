import { Router } from "express";
import { MiddleWare } from "../middleware/middleWare";
import { GlobalUtilis } from "../Utilis/GlobalUtilis";
import { DashboardControllers } from "../controllers/DashboardControllers";
import { DashboardValidator } from "../validators/DashboardValidator";

class DashboardRouter {
    public router: Router;
    constructor() {
        this.router = Router();
        this.router.use(GlobalUtilis.authenticateToken, GlobalUtilis.authRestaurant);
        const upload = new GlobalUtilis().upload;
        const check = MiddleWare.checkErrors;

        this.router.get('/', DashboardControllers.getProfile);
        this.router.patch('/', DashboardValidator.updateProfile(), check, DashboardControllers.updateProfile);
        this.router.put('/image', upload.single('restaurantImg'), DashboardValidator.image('restaurantImg'), check, DashboardControllers.updateImage);

        this.router.get('/orders', DashboardValidator.orders(), check, DashboardControllers.getOrders);
        this.router.get('/stats', DashboardValidator.stats(), check, DashboardControllers.getStats);

        this.router.get('/categories', DashboardControllers.getCategories);
        this.router.post('/categories', DashboardValidator.createCategory(), check, DashboardControllers.createCategory);
        this.router.delete('/categories/:id', DashboardValidator.id(), check, DashboardControllers.deleteCategory);

        this.router.get('/items', DashboardValidator.items(), check, DashboardControllers.getItems);
        this.router.post('/items', upload.single('ItemsImg'), DashboardValidator.createItem(), check, DashboardControllers.createItem);
        this.router.patch('/items/:id', DashboardValidator.updateItem(), check, DashboardControllers.updateItem);
        this.router.put('/items/:id/image', upload.single('ItemsImg'), DashboardValidator.id(), DashboardValidator.image('ItemsImg'), check, DashboardControllers.updateItemImage);
        this.router.delete('/items/:id', DashboardValidator.id(), check, DashboardControllers.deleteItem);
    }
}

export default new DashboardRouter().router;
