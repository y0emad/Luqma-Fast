import type { NextFunction, Request, Response } from "express";
import Category from "../models/Category";

export class CategoryControllers {
    static async getCategory(req: Request, res: Response, next: NextFunction) {
        try {
            const data = await Category.find({ restaurant_id: req.params.restaurant_id }, { __v: 0 });
            res.status(200).json({ message: 'Categories retrieved successfully', status: 200, data });
        } catch (error) {
            next(error);
        }
    }

    static async createCategory(req: Request, res: Response, next: NextFunction) {
        try {
            const data = await Category.create({ restaurant_id: req.body.restaurant_id, name: req.body.name });
            res.status(201).json({ message: 'Category created successfully', status: 201, data });
        } catch (error) {
            next(error);
        }
    }
}
