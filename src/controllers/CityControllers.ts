import type { NextFunction, Request, Response } from "express";
import City from "../models/City";

export class CityControllers {
    static async createCity(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, lon, lat } = req.body;
            const data = await City.create({ name, lon, lat });
            res.status(201).json({ message: 'City created successfully', status: 201, data });
        } catch (error) {
            next(error);
        }
    }

    static async getCity(_req: Request, res: Response, next: NextFunction) {
        try {
            const data = await City.find({ status: 'active' }).sort({ name: 1 });
            res.status(200).json({ message: 'Cities retrieved successfully', status: 200, data });
        } catch (error) {
            next(error);
        }
    }
}
