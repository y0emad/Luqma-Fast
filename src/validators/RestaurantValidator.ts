import { body, query } from "express-validator"
import User from "../models/User"
import City from "../models/City";



export class RestaurantValidator {
    static create() {
        return [
            body('email', 'User email is required').isEmail().custom(async (value, { req }) => {
                if (value) {
                    try {
                        const user = await User.findOne({ email: value });
                        if (user) {
                            return Promise.reject('User already exists');
                        } else {
                            return Promise.resolve();
                        }
                    } catch (err) {
                        return Promise.reject('User not found');
                    }
                }


            }),
            body('password', 'Password is required').isString().isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),

            body('city_id', 'City id is required').isMongoId().custom(async (value, { req }) => {
                if (value) {
                    try {
                        const city = await City.findById(value);
                        if (!city) {
                            return Promise.reject('City not found');
                        }
                    } catch (err) {
                        return Promise.reject('City not found');
                    }
                }
            }),
            body('type', 'Type is required').isString(),
           

            body('name', 'Restaurant name is required').isString(),
            body('cuisines', 'Restaurant cuisines are required')
            .customSanitizer(value => {
                if (Array.isArray(value)) return value;
                if (typeof value === 'string') return value.split(',');
                return [];
            })
            .isArray({ min: 1 }),
            body('opening_time', 'Restaurant opening time is required').isString(),
            body('address', 'Restaurant address is required').isString(),
            body('closing_time', 'Restaurant closing time is required').isString(),
            body('delivery_time', 'Restaurant delivery time is required').isString(),
            body('delivery_fee', 'Restaurant delivery fee is required').isFloat()

        ]
    }

    static getNearbyRestaurants() {
        return [
            query('latitude', 'Latitude is required').isFloat({ min: -90, max: 90 }),
            query('longitude', 'Longitude is required').isFloat({ min: -180, max: 180 }),
            query('radius', 'Radius is required').isFloat({ min: 0 }),
        ]   }
    static searchNearbyRestaurants() {
        return [
            query('latitude', 'Latitude is required').isFloat({ min: -90, max: 90 }),
            query('longitude', 'Longitude is required').isFloat({ min: -180, max: 180 }),
            query('radius', 'Radius is required').isFloat({ min: 0 }),
            query('name', 'Name is required').isString(),
        ]   }
}


