import { body, query } from "express-validator"
import City from "../models/City";

const parseJson = (value: unknown) => {
    if (typeof value !== 'string') return value;
    try { return JSON.parse(value); } catch { return value; }
};

const geoQuery = () => [
    query('latitude', 'Latitude must be between -90 and 90').isFloat({ min: -90, max: 90 }),
    query('longitude', 'Longitude must be between -180 and 180').isFloat({ min: -180, max: 180 }),
    query('radius', 'Radius must be between 0 and 100 km').isFloat({ gt: 0, max: 100 }),
    query('page', 'Page must be a positive number').optional().isInt({ min: 1 }),
];

export class RestaurantValidator {
    static create() {
        return [
            body('email', 'A valid email is required').isEmail().trim().toLowerCase(),
            body('password', 'Password must be at least 8 characters long').isString().isLength({ min: 8, max: 72 }),
            body('city_id', 'City id is required').isMongoId().bail().custom(async (value) => {
                if (!(await City.exists({ _id: value }))) {
                    throw new Error('City not found');
                }
            }),
            body('name', 'Restaurant name is required').isString().trim().notEmpty(),
            body('description').optional().isString(),
            body('cuisines', 'At least one cuisine is required')
                .customSanitizer((value) => {
                    const parsed = parseJson(value);
                    const list = Array.isArray(parsed) ? parsed : typeof parsed === 'string' ? parsed.split(',') : [];
                    return [...new Set(list.map((c: unknown) => String(c).trim()).filter(Boolean))];
                })
                .isArray({ min: 1 }),
            body('location', 'Location must be a GeoJSON point: {"type":"Point","coordinates":[lng,lat]}')
                .customSanitizer(parseJson)
                .custom((value) => {
                    const [lng, lat] = value?.coordinates ?? [];
                    return value?.type === 'Point' && Array.isArray(value.coordinates) && value.coordinates.length === 2
                        && Number.isFinite(lng) && Number.isFinite(lat)
                        && lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
                }),
            body('opening_time', 'Opening time must be HH:mm').matches(/^([01]\d|2[0-3]):[0-5]\d$/),
            body('closing_time', 'Closing time must be HH:mm').matches(/^([01]\d|2[0-3]):[0-5]\d$/),
            body('address', 'Restaurant address is required').isString().trim().notEmpty(),
            body('delivery_time', 'Restaurant delivery time is required').isString().notEmpty(),
            body('delivery_fee', 'Delivery fee must be a positive number').isFloat({ min: 0 }).toFloat()
        ]
    }

    static getNearbyRestaurants() {
        return geoQuery();
    }

    static searchNearbyRestaurants() {
        return [...geoQuery(), query('name', 'Name is required').isString().trim().isLength({ min: 1, max: 100 })];
    }
}
