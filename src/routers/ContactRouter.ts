import { Router } from "express";
import { body, param, query } from "express-validator";
import { MiddleWare } from "../middleware/middleWare";
import { GlobalUtilis } from "../Utilis/GlobalUtilis";
import { ContactControllers } from "../controllers/ContactControllers";
import { contactLimiter } from "../middleware/rateLimit";

class ContactRouter {
    public router: Router;
    constructor() {
        this.router = Router();
        this.router.post('/',
            contactLimiter,
            body('name', 'Name must be 2-100 characters').isString().trim().isLength({ min: 2, max: 100 }),
            body('email', 'A valid email is required').isEmail().trim().toLowerCase(),
            body('subject', 'Pick a subject').optional().isIn(['order', 'restaurant', 'payment', 'other']),
            body('message', 'Message must be 10-2000 characters').isString().trim().isLength({ min: 10, max: 2000 }),
            body('order_ref', 'Order number is too long').optional({ values: 'falsy' }).isString().trim().isLength({ max: 30 }),
            MiddleWare.checkErrors,
            ContactControllers.create);
        this.router.get('/', GlobalUtilis.authenticateToken, GlobalUtilis.authAdmin, query('page').optional().isInt({ min: 1 }), MiddleWare.checkErrors, ContactControllers.list);
        this.router.patch('/:id', GlobalUtilis.authenticateToken, GlobalUtilis.authAdmin, param('id').isMongoId(), MiddleWare.checkErrors, ContactControllers.markRead);
    }
}

export default new ContactRouter().router;
