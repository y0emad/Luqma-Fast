import { body, param, query } from "express-validator";
import { ORDER_STATUSES } from "../Utilis/OrderStatus";

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const imageRequired = (field: string) =>
    body(field).custom((_value, { req }) => {
        if (!req.file) throw new Error('Image file is required');
        return true;
    });

export class DashboardValidator {
    static updateProfile() {
        return [
            body('name', 'Name must be 2-100 characters').optional().isString().trim().isLength({ min: 2, max: 100 }),
            body('description', 'Description must be under 500 characters').optional().isString().isLength({ max: 500 }),
            body('address', 'Address must not be empty').optional().isString().trim().notEmpty(),
            body('opening_time', 'Opening time must be HH:mm').optional().matches(HHMM),
            body('closing_time', 'Closing time must be HH:mm').optional().matches(HHMM),
            body('delivery_time', 'Delivery time must not be empty').optional().isString().notEmpty(),
            body('delivery_fee', 'Delivery fee must be a positive number').optional().isFloat({ min: 0 }).toFloat(),
            body('isClosed', 'isClosed must be true or false').optional().isBoolean().toBoolean(),
        ];
    }

    static image(field: string) {
        return [imageRequired(field)];
    }

    static orders() {
        return [
            query('page', 'Page must be a positive number').optional().isInt({ min: 1 }),
            query('status', `Status must be one of: ${ORDER_STATUSES.join(', ')}`).optional().isIn([...ORDER_STATUSES]),
        ];
    }

    static createCategory() {
        return [body('name', 'Category name must be 1-60 characters').isString().trim().isLength({ min: 1, max: 60 })];
    }

    static id(name = 'id') {
        return [param(name, 'Invalid id').isMongoId()];
    }

    static items() {
        return [
            query('category_id', 'Invalid category id').optional().isMongoId(),
            query('status', 'Status must be active or inactive').optional().isIn(['active', 'inactive']),
        ];
    }

    static createItem() {
        return [
            body('category_id', 'Category ID is required').isMongoId(),
            body('name', 'Item name must be 1-100 characters').isString().trim().isLength({ min: 1, max: 100 }),
            body('price', 'Price must be a positive number').isFloat({ gt: 0 }).toFloat(),
            body('vegetarian', 'Vegetarian must be true or false').isBoolean().toBoolean(),
            body('status', 'Status must be active or inactive').optional().isIn(['active', 'inactive']),
            imageRequired('ItemsImg'),
        ];
    }

    static updateItem() {
        return [
            param('id', 'Invalid id').isMongoId(),
            body('category_id', 'Invalid category id').optional().isMongoId(),
            body('name', 'Item name must be 1-100 characters').optional().isString().trim().isLength({ min: 1, max: 100 }),
            body('price', 'Price must be a positive number').optional().isFloat({ gt: 0 }).toFloat(),
            body('vegetarian', 'Vegetarian must be true or false').optional().isBoolean().toBoolean(),
            body('status', 'Status must be active or inactive').optional().isIn(['active', 'inactive']),
        ];
    }

    static stats() {
        return [query('day', 'Day must be YYYY-MM-DD').optional().isISO8601({ strict: true }).matches(/^\d{4}-\d{2}-\d{2}$/)];
    }
}
