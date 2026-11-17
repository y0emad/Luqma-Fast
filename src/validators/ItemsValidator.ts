import { body, param } from "express-validator"
import Restaurant from "../models/Restaurant";
import Category from "../models/Category";


export class ItemsValidator {
    static CreateItems() {
        return [
            body('restaurant_id', 'Restaurant ID is required').isMongoId().custom(async (value) => {
                const restaurant = await Restaurant.findById(value);
                if (!restaurant) {
                    return Promise.reject('Restaurant not found');
                }
                return true;

            }),
            body('category_id', 'Category ID is required').isMongoId().custom(async (value, { req }) => {
                const category = await Category.findOne({ _id: value, restaurant_id: req.body.restaurant_id });
                if (!category) {
                    return Promise.reject('Category not found for this restaurant');
                }
                return true;
            }),
            body('name', 'Item name is required').isString(),
            body('status', 'Status must be either active or inactive').optional().isIn(['active', 'inactive']),
            body('vegetarian', 'Vegetarian must be a boolean value').isBoolean(),
            body('ItemsImg', 'Cover image URL is required').custom((value, { req }) => {
                if (!req.file) {

                    throw new Error('Cover image file is required');
                }
                return true;
            }),
            body('price', 'Price must be a positive number').isFloat({ gt: 0 }),




        ]
    }


    static getMenu() {
        return [
            param('restaurantId', 'Restaurant ID is invalid').isMongoId().bail()
                .custom(async (value, { req }) => {
                    const restaurant = await Restaurant.findById(value);
                    if (!restaurant) {
                        return Promise.reject('Restaurant not found');
                    }
                    req.rest = restaurant;
                }),
        ];
    }
}


