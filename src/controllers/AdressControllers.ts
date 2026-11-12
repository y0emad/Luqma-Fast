import type { NextFunction, Request, Response } from "express";
import Address from "../models/Address";
import { GlobalUtilis } from "../Utilis/GlobalUtilis";
import { AppError } from "../Utilis/AppError";

export class AddressControllers {
    static async createAddress(req: Request, res: Response, next: NextFunction) {
        try {
            const { landmark, lat, lon, house, title, address } = req.body;
            const data = await Address.create({ landmark, lat, lon, house, title, address, user_id: req.user!.aud });
            res.status(201).json({ message: 'Address created successfully', status: 201, data });
        } catch (error) {
            next(error);
        }
    }

    static async getAddress(req: Request, res: Response, next: NextFunction) {
        try {
            const filter = { user_id: req.user!.aud };
            const { page, perPage, skip } = GlobalUtilis.pageParams(req.query);
            const [total, data] = await Promise.all([
                Address.countDocuments(filter),
                Address.find(filter).sort({ created_at: -1 }).skip(skip).limit(perPage),
            ]);
            res.status(200).json({ message: 'Addresses retrieved successfully', status: 200, data, pagination: GlobalUtilis.pagination(page, perPage, total) });
        } catch (error) {
            next(error);
        }
    }

    static async updateAddress(req: Request, res: Response, next: NextFunction) {
        try {
            const { landmark, lat, lon, house, title, address } = req.body;
            const data = await Address.findOneAndUpdate(
                { _id: req.params.id, user_id: req.user!.aud },
                { landmark, lat, lon, house, title, address },
                { new: true, runValidators: true },
            );
            if (!data) throw new AppError(404, 'Address not found');
            res.status(200).json({ message: 'Address updated successfully', status: 200, data });
        } catch (error) {
            next(error);
        }
    }

    static async deleteAddress(req: Request, res: Response, next: NextFunction) {
        try {
            const deleted = await Address.findOneAndDelete({ _id: req.params.id, user_id: req.user!.aud });
            if (!deleted) throw new AppError(404, 'Address not found');
            res.status(200).json({ message: 'Address deleted successfully', status: 200 });
        } catch (error) {
            next(error);
        }
    }

    static async getAddressById(req: Request, res: Response, next: NextFunction) {
        try {
            const data = await Address.findOne({ _id: req.params.AddressId, user_id: req.user!.aud });
            if (!data) throw new AppError(404, 'Address not found');
            res.status(200).json({ message: 'Address retrieved successfully', status: 200, data });
        } catch (error) {
            next(error);
        }
    }

    static async checkAddress(req: Request, res: Response, next: NextFunction) {
        try {
            const lat = parseFloat(String(req.query.lat));
            const lon = parseFloat(String(req.query.lon));
            const data = await Address.findOne({ lat, lon, user_id: req.user!.aud });
            if (!data) throw new AppError(404, 'Address not found');
            res.status(200).json({ message: 'Address retrieved successfully', status: 200, data });
        } catch (error) {
            next(error);
        }
    }

    static async getAddressLimit(req: Request, res: Response, next: NextFunction) {
        try {
            const limit = Math.min(parseInt(String(req.query.limit ?? '10'), 10) || 10, 50);
            const offset = parseInt(String(req.query.offset ?? '0'), 10) || 0;
            const data = await Address.find({ user_id: req.user!.aud }).sort({ created_at: -1 }).skip(offset).limit(limit);
            res.status(200).json({ message: 'Addresses retrieved successfully', status: 200, data });
        } catch (error) {
            next(error);
        }
    }
}
