import type { NextFunction, Request, Response } from "express";
import Restaurant from "../models/Restaurant";
import Category from "../models/Category";
import Items from "../models/Items";
import Order from "../models/Order";
import { GlobalUtilis } from "../Utilis/GlobalUtilis";
import { AppError } from "../Utilis/AppError";
import { dayRange, withOpenFlag, APP_TZ } from "../Utilis/OpeningHours";
import { ORDER_STATUSES } from "../Utilis/OrderStatus";

const pick = (body: Record<string, any>, keys: string[]) =>
    Object.fromEntries(keys.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

async function ownCategory(restaurantId: any, categoryId: any) {
    const category = await Category.findOne({ _id: categoryId, restaurant_id: restaurantId });
    if (!category) throw new AppError(422, 'Category not found in your restaurant');
    return category;
}

export class DashboardControllers {
    static async getProfile(req: Request, res: Response) {
        res.status(200).json({ status: 200, data: withOpenFlag(req.restaurant) });
    }

    static async updateProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const update = pick(req.body, ['name', 'description', 'address', 'opening_time', 'closing_time', 'delivery_time', 'delivery_fee', 'isClosed']);
            const data = await Restaurant.findByIdAndUpdate(req.restaurant._id, update, { new: true });
            res.status(200).json({ message: 'Restaurant updated', status: 200, data: withOpenFlag(data) });
        } catch (error) {
            next(error);
        }
    }

    static async updateImage(req: Request, res: Response, next: NextFunction) {
        try {
            const restaurantImg = GlobalUtilis.filePath(req.file!);
            const data = await Restaurant.findByIdAndUpdate(req.restaurant._id, { restaurantImg }, { new: true });
            await GlobalUtilis.removeFile(req.restaurant.restaurantImg);
            res.status(200).json({ message: 'Image updated', status: 200, data });
        } catch (error) {
            next(error);
        }
    }

    static async getOrders(req: Request, res: Response, next: NextFunction) {
        try {
            const filter: Record<string, any> = { restaurant_id: req.restaurant._id, status: { $ne: 'awaiting_payment' } };
            if (req.query.status && req.query.status !== 'awaiting_payment') filter.status = req.query.status;
            const { page, perPage, skip } = GlobalUtilis.pageParams(req.query, 10);
            const [total, data] = await Promise.all([
                Order.countDocuments(filter),
                Order.find(filter).sort({ created_at: -1 }).skip(skip).limit(perPage).populate('user_id', 'name email'),
            ]);
            res.status(200).json({ status: 200, data, pagination: GlobalUtilis.pagination(page, perPage, total) });
        } catch (error) {
            next(error);
        }
    }

    static async getCategories(req: Request, res: Response, next: NextFunction) {
        try {
            const data = await Category.find({ restaurant_id: req.restaurant._id }, { __v: 0 }).sort({ name: 1 });
            res.status(200).json({ status: 200, data });
        } catch (error) {
            next(error);
        }
    }

    static async createCategory(req: Request, res: Response, next: NextFunction) {
        try {
            const name = req.body.name;
            const exists = await Category.exists({ restaurant_id: req.restaurant._id, name: { $regex: `^${GlobalUtilis.escapeRegex(name)}$`, $options: 'i' } });
            if (exists) throw new AppError(409, 'You already have a category with this name');
            const data = await Category.create({ restaurant_id: req.restaurant._id, name });
            res.status(201).json({ message: 'Category created', status: 201, data });
        } catch (error) {
            next(error);
        }
    }

    static async deleteCategory(req: Request, res: Response, next: NextFunction) {
        try {
            const category = await ownCategory(req.restaurant._id, req.params.id).catch(() => null);
            if (!category) throw new AppError(404, 'Category not found');
            if (await Items.exists({ category_id: category._id })) {
                throw new AppError(409, 'Move or delete the items in this category first');
            }
            await category.deleteOne();
            res.status(200).json({ message: 'Category deleted', status: 200 });
        } catch (error) {
            next(error);
        }
    }

    static async getItems(req: Request, res: Response, next: NextFunction) {
        try {
            const filter: Record<string, any> = { restaurant_id: req.restaurant._id };
            if (req.query.category_id) filter.category_id = req.query.category_id;
            if (req.query.status) filter.status = req.query.status;
            const data = await Items.find(filter, { __v: 0 }).sort({ name: 1 });
            res.status(200).json({ status: 200, data });
        } catch (error) {
            next(error);
        }
    }

    static async createItem(req: Request, res: Response, next: NextFunction) {
        const cover = req.file ? GlobalUtilis.filePath(req.file) : undefined;
        try {
            await ownCategory(req.restaurant._id, req.body.category_id);
            const { name, price, vegetarian, status, category_id } = req.body;
            const data = await Items.create({ restaurant_id: req.restaurant._id, category_id, name, price, vegetarian, status, cover });
            res.status(201).json({ message: 'Item created', status: 201, data });
        } catch (error) {
            await GlobalUtilis.removeFile(cover);
            next(error);
        }
    }

    static async updateItem(req: Request, res: Response, next: NextFunction) {
        try {
            if (req.body.category_id) await ownCategory(req.restaurant._id, req.body.category_id);
            const update = pick(req.body, ['name', 'price', 'vegetarian', 'status', 'category_id']);
            const data = await Items.findOneAndUpdate({ _id: req.params.id, restaurant_id: req.restaurant._id }, update, { new: true });
            if (!data) throw new AppError(404, 'Item not found');
            res.status(200).json({ message: 'Item updated', status: 200, data });
        } catch (error) {
            next(error);
        }
    }

    static async updateItemImage(req: Request, res: Response, next: NextFunction) {
        const cover = GlobalUtilis.filePath(req.file!);
        try {
            const old = await Items.findOneAndUpdate({ _id: req.params.id, restaurant_id: req.restaurant._id }, { cover });
            if (!old) throw new AppError(404, 'Item not found');
            await GlobalUtilis.removeFile(old.cover);
            res.status(200).json({ message: 'Image updated', status: 200, data: { ...old.toJSON(), cover } });
        } catch (error) {
            await GlobalUtilis.removeFile(cover);
            next(error);
        }
    }

    static async deleteItem(req: Request, res: Response, next: NextFunction) {
        try {
            const item = await Items.findOneAndDelete({ _id: req.params.id, restaurant_id: req.restaurant._id });
            if (!item) throw new AppError(404, 'Item not found');
            await GlobalUtilis.removeFile(item.cover);
            res.status(200).json({ message: 'Item deleted', status: 200 });
        } catch (error) {
            next(error);
        }
    }

    static async getStats(req: Request, res: Response, next: NextFunction) {
        try {
            const { from, to } = dayRange(req.query.day as string | undefined);
            const match = { restaurant_id: req.restaurant._id, created_at: { $gte: from, $lt: to }, status: { $ne: 'awaiting_payment' } };

            const [facet] = await Order.aggregate([
                { $match: match },
                {
                    $facet: {
                        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
                        delivered: [
                            { $match: { status: 'delivered' } },
                            { $group: { _id: null, revenue: { $sum: '$grand_total' }, orders: { $sum: 1 } } },
                        ],
                        topItems: [
                            { $match: { status: { $ne: 'cancelled' } } },
                            { $unwind: '$items' },
                            {
                                $group: {
                                    _id: '$items.item_id',
                                    name: { $last: '$items.name' },
                                    quantity: { $sum: '$items.quantity' },
                                    revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
                                },
                            },
                            { $sort: { quantity: -1, revenue: -1 } },
                            { $limit: 5 },
                            { $project: { _id: 0, item_id: '$_id', name: 1, quantity: 1, revenue: 1 } },
                        ],
                    },
                },
            ]);

            const by_status = Object.fromEntries(ORDER_STATUSES.filter((s) => s !== 'awaiting_payment').map((s) => [s, 0])) as Record<string, number>;
            for (const row of facet.byStatus) by_status[row._id] = row.count;
            const total = Object.values(by_status).reduce((a, b) => a + b, 0);
            const delivered = facet.delivered[0] ?? { revenue: 0, orders: 0 };
            const round2 = (n: number) => Math.round(n * 100) / 100;

            res.status(200).json({
                status: 200,
                data: {
                    from, to, timezone: APP_TZ,
                    orders: { total, by_status },
                    revenue: round2(delivered.revenue),
                    average_order_value: delivered.orders ? round2(delivered.revenue / delivered.orders) : 0,
                    top_items: facet.topItems.map((i: any) => ({ ...i, revenue: round2(i.revenue) })),
                },
            });
        } catch (error) {
            next(error);
        }
    }
}
