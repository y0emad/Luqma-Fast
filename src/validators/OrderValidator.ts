import { body, } from "express-validator"
import Restaurant from "../models/Restaurant";



export class OrderValidator {
    static createOrder() {
        return [
            body('restaurant_id', 'Restaurant ID is required').isMongoId().custom(async (value, { req }) => {
                const restaurant = await Restaurant.findById(value);
                if (!restaurant) {
                    return Promise.reject('Restaurant not found');
                }
                return true;
            }),
            body('status', 'Status is required').isString(),
            body('address', 'Address is required').isString(),
            body('order', 'Order is required').isString(),
            body('total', 'Total is required').isNumeric().withMessage('Total must be a number'),
            body('grand_total', 'Grand Total is required').isNumeric().withMessage('Grand Total must be a number'),
            body('delivery_charge', 'Delivery Charge is required').isNumeric().withMessage('Delivery Charge must be a number'),
            body('payment_status', 'Payment Status is required').isBoolean().withMessage('Payment Status must be a boolean'),
            body('payment_method', 'Payment Method is required').isString().withMessage('Payment Method must be a string')

        ]

    }


}


