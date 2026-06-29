import { body, query } from "express-validator"


export class BannerValidator {
    static addBanner() {
        return [

            body('banner', 'Banner is required').custom((value, { req }) => {
                if (!req.file) {
                    throw new Error('Banner file is required');
                }
                return true;
            })
        ]
    }


    static addManyBanner() {
        return [
            body('banner', 'At least one banner file is required').custom((value, { req }) => {
                if (!req.files || req.files.length === 0) {
                    throw new Error('At least one banner file is required');
                }
                return true;
            })
        ]
    }
}
