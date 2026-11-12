import { body, param, query } from "express-validator"
import Restaurant from "../models/Restaurant";
import { ORDER_STATUSES } from "../Utilis/OrderStatus";
import { normalizePhone } from "../services/PaymentService";

const phone = () => body('phone').custom((value, { req }) => {
    const needed = req.body?.payment_method === 'card';
    if (value === undefined && !needed) return true;
    if (typeof value !== 'string' || !normalizePhone(value)) {
        throw new Error('A valid Egyptian mobile number (01XXXXXXXXX) is required for card payments');
    }
    return true;
});

export class OrderValidator {
    static createOrder() {
        return [
            body('restaurant_id', 'Restaurant ID is required').isMongoId().bail().custom(async (value, { req }) => {
                const restaurant = await Restaurant.findById(value);
                if (!restaurant) {
                    throw new Error('Restaurant not found');
                }
                req.restaurant = restaurant;
                return true;
            }),
            body('address', 'Address is required').isString().trim().notEmpty(),
            body('instructions', 'Instructions must be a string').optional().isString().isLength({ max: 500 }),
            body('items')
                .customSanitizer(value => {
                    if (typeof value === 'string') {
                        try { return JSON.parse(value); } catch { return value; }
                    }
                    return value;
                })
                .isArray({ min: 1, max: 50 }).withMessage('Items must be a non-empty array'),
            body('items.*.item_id', 'Each item needs a valid item_id').isMongoId(),
            body('items.*.quantity', 'Each item needs a quantity between 1 and 50').isInt({ min: 1, max: 50 }).toInt(),
            body('payment_method', 'Payment method must be cash or card').isIn(['cash', 'card']),
            phone(),
        ]
    }

    static getOrders() {
        return [
            query('page', 'Page must be a positive number').optional().isInt({ min: 1 }),
            query('status', `Status must be one of: ${ORDER_STATUSES.join(', ')}`).optional().isIn([...ORDER_STATUSES]),
        ]
    }

    static orderId() {
        return [param('id', 'Order ID is invalid').isMongoId()]
    }

    static cancelOrder() {
        return [
            param('id', 'Order ID is invalid').isMongoId(),
            body('reason', 'Reason must be under 300 characters').optional().isString().isLength({ max: 300 }),
        ]
    }

    static payOrder() {
        return [
            param('id', 'Order ID is invalid').isMongoId(),
            body('phone', 'A valid Egyptian mobile number (01XXXXXXXXX) is required').optional().custom((v) => typeof v === 'string' && normalizePhone(v) !== null),
        ]
    }

    static updateStatus() {
        return [
            param('id', 'Order ID is invalid').isMongoId(),
            body('status', 'Status must be accepted, preparing, on_the_way, delivered or cancelled')
                .isIn(['accepted', 'preparing', 'on_the_way', 'delivered', 'cancelled']),
            body('reason', 'Reason must be under 300 characters').optional().isString().isLength({ max: 300 }),
        ]
    }
}
