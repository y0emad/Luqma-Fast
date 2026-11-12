import type { NextFunction, Request, Response } from "express";
import Banner from "../models/Banner";
import { GlobalUtilis } from "../Utilis/GlobalUtilis";

export class BannerControllers {
    static async addBanner(req: Request, res: Response, next: NextFunction) {
        try {
            const data = await Banner.create({
                banner: GlobalUtilis.filePath(req.file!),
                ...(req.body.restaurant_id ? { restaurant_id: req.body.restaurant_id } : {}),
            });
            res.status(201).json({ message: 'Banner added successfully', status: 201, data });
        } catch (error) {
            next(error);
        }
    }

    static async getBanner(_req: Request, res: Response, next: NextFunction) {
        try {
            const data = await Banner.find({ isShow: 1 }).sort({ created_at: -1 });
            res.status(200).json({ message: 'Banners retrieved successfully', status: 200, data });
        } catch (error) {
            next(error);
        }
    }

    static async addManyBanner(req: Request, res: Response, next: NextFunction) {
        try {
            const files = req.files as Express.Multer.File[];
            const data = await Banner.insertMany(files.map((file) => ({ banner: GlobalUtilis.filePath(file) })));
            res.status(201).json({ message: 'Banners added successfully', status: 201, data });
        } catch (error) {
            next(error);
        }
    }
}
