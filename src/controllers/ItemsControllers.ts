
import Category from "../models/Category";
import Items from "../models/Items";

export class ItemsControllers {
    static async createItem(req: any, res: any, next: any) {
        try {
            const price = req.body.price ? parseFloat(req.body.price) : undefined;
            const { name, restaurant_id, category_id, status, vegetarian } = req.body;

            const cover = req.file?.path

            const newItem = new Items({ name, restaurant_id, category_id, status, vegetarian, price, cover });
            await newItem.save();
            res.status(200).json({ message: 'Item created successfully', status: 200 });
        } catch (error) {
            next(error);
        }
    }

    static async getItems(req: any, res: any, next: any) {
        try {
            const items = await Items.find();
            res.status(200).json({ message: 'Items retrieved successfully', status: 200, data: items });
        } catch (error) {
            next(error);
        }
    }
    static async getMenu(req: any, res: any, next: any) {
        try {
            const restaurant = req.rest;
            const items = await Items.find({
                status: 'active',
                restaurant_id: restaurant._id
            });
            const category = await Category.find({ restaurant_id: restaurant._id });
            res.status(200).json({ message: 'Menu retrieved successfully', status: 200, data: { restaurant, category, items } });
        } catch (error) {
            next(error);
        }
    }
}
