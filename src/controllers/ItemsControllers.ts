import type { NextFunction, Request, Response } from "express";
import Category from "../models/Category";
import Items from "../models/Items";
import { GlobalUtilis } from "../Utilis/GlobalUtilis";
import { withOpenFlag } from "../Utilis/OpeningHours";

export class ItemsControllers {
    static async createItem(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, restaurant_id, category_id, status, vegetarian, price } = req.body;
            const data = await Items.create({
                name, restaurant_id, category_id, status, vegetarian, price,
                cover: GlobalUtilis.filePath(req.file!),
            });
            res.status(201).json({ message: 'Item created successfully', status: 201, data });
        } catch (error) {
            next(error);
        }
    }

    static async getItems(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, perPage, skip } = GlobalUtilis.pageParams(req.query, 20);
            const filter = { status: 'active' };
            const [total, data] = await Promise.all([
                Items.countDocuments(filter),
                Items.find(filter).skip(skip).limit(perPage),
            ]);
            res.status(200).json({ message: 'Items retrieved successfully', status: 200, data, pagination: GlobalUtilis.pagination(page, perPage, total) });
        } catch (error) {
            next(error);
        }
    }

    static async getMenu(req: Request, res: Response, next: NextFunction) {
        try {
            const restaurant = req.rest;
            const [items, category] = await Promise.all([
                Items.find({ status: 'active', restaurant_id: restaurant._id }),
                Category.find({ restaurant_id: restaurant._id }),
            ]);
            res.status(200).json({ message: 'Menu retrieved successfully', status: 200, data: { restaurant: withOpenFlag(restaurant), category, items } });
        } catch (error) {
            next(error);
        }
    }
}
