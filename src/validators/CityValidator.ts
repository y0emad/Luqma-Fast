import { body, query } from "express-validator"


export class CityValidator {
    static createCity() {
        return [
            body('name', 'City name is required').isString(),
            body('lon', 'City longitude is required').isFloat(),
            body('lat', 'City latitude is required').isFloat()
        ]
    }
}


