import { body, param, query } from "express-validator"
import Address from "../models/Address";


export class AddressValidator {
    static createAddress() {
        return [
            body('landmark', 'Landmark is required').isString(),
            body('lat', 'Latitude is required').isFloat(),
            body('lon', 'Longitude is required').isFloat(),
            body('house', 'House number is required').isString(),
            body('title', 'Title is required').isString(),
            body('address', 'Address is required').isString()

        ]

    }

    static updateAddress() {
        return [
            param('id', 'Address ID is required').isMongoId(),
            body('landmark', 'Landmark must be a string').optional().isString(),
            body('lat', 'Latitude must be a number').optional().isFloat(),
            body('lon', 'Longitude must be a number').optional().isFloat(),
            body('house', 'House number must be a string').optional().isString(),
            body('title', 'Title must be a string').optional().isString(),
            body('address', 'Address must be a string').optional().isString()]
    }

    static deleteAddress() {
        return [
            param('id', 'Address ID is required').isMongoId()
        ]
    }


    static getAddressById() {
        return [
            param('AddressId', 'Address ID is required').isMongoId()
        ]
    }

    static checkAddress() {
        return [
            query('lat', 'Latitude is required').isFloat(),
            query('lon', 'Longitude is required').isFloat()
        ]
    }

    static getAddressesLimit() {
        return [
            query('limit', 'Limit must be a number').optional().isInt({ min: 1 }),
            query('offset', 'Offset must be a number').optional().isInt({ min: 0 })
        ]
    }

    static getAddresses() {
        return [query('page', 'Page must be a number').optional().isInt({ min: 1 }),]
    }
}


