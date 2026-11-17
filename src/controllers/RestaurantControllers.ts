import type { NextFunction, Request, Response } from "express";
import Category from "../models/Category";
import Restaurant from "../models/Restaurant";
import User from "../models/User";
import { GlobalUtilis } from "../Utilis/GlobalUtilis";
import { listReviews } from "../services/ReviewService";
import { withOpenFlag } from "../Utilis/OpeningHours";

const EARTH_RADIUS_KM = 6378.1;

function geoFilters(query: any) {
    const lng = parseFloat(String(query.longitude));
    const lat = parseFloat(String(query.latitude));
    const radiusKm = parseFloat(String(query.radius));
    const name = query.name ? { name: { $regex: GlobalUtilis.escapeRegex(String(query.name)), $options: 'i' } } : {};
    return {
        count: { ...name, isClosed: false, location: { $geoWithin: { $centerSphere: [[lng, lat], radiusKm / EARTH_RADIUS_KM] } } },
        find: { ...name, isClosed: false, location: { $nearSphere: { $geometry: { type: "Point", coordinates: [lng, lat] }, $maxDistance: radiusKm * 1000 } } },
    };
}

export class RestaurantControllers {
    static async createRestaurant(req: Request, res: Response, next: NextFunction) {
        const { email, password, city_id, name, location, cuisines, address, description,
            opening_time, closing_time, delivery_time, delivery_fee } = req.body;
        const restaurantImg = req.file ? GlobalUtilis.filePath(req.file) : undefined;
        let userId: unknown;
        let restaurantId: unknown;
        try {
            const user = await User.create({
                name, email, password: await GlobalUtilis.hashPassword(password), type: 'restaurant', verified: true,
            });
            userId = user._id;

            const restaurant = await Restaurant.create({
                user_id: user._id, city_id, name, description, address, location, cuisines, restaurantImg,
                opening_time, closing_time, delivery_time, delivery_fee,
            });
            restaurantId = restaurant._id;

            await Category.insertMany(cuisines.map((cuisine: string) => ({ restaurant_id: restaurant._id, name: cuisine })));
            res.status(201).json({ message: 'Restaurant created successfully', status: 201, data: restaurant });
        } catch (error) {
            await Promise.allSettled([
                restaurantId ? Category.deleteMany({ restaurant_id: restaurantId }) : null,
                restaurantId ? Restaurant.deleteOne({ _id: restaurantId }) : null,
                userId ? User.deleteOne({ _id: userId }) : null,
                GlobalUtilis.removeFile(restaurantImg),
            ]);
            next(error);
        }
    }

    static async getNearbyRestaurants(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, perPage, skip } = GlobalUtilis.pageParams(req.query);
            const filters = geoFilters(req.query);
            const [total, data] = await Promise.all([
                Restaurant.countDocuments(filters.count),
                Restaurant.find(filters.find).skip(skip).limit(perPage),
            ]);
            res.status(200).json({ message: 'Nearby restaurants retrieved successfully', status: 200, data: data.map((r) => withOpenFlag(r)), pagination: GlobalUtilis.pagination(page, perPage, total) });
        } catch (error) {
            next(error);
        }
    }

    static async searchNearbyRestaurants(req: Request, res: Response, next: NextFunction) {
        return RestaurantControllers.getNearbyRestaurants(req, res, next);
    }

    static async getRestaurants(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, perPage, skip } = GlobalUtilis.pageParams(req.query);
            const [total, data] = await Promise.all([
                Restaurant.countDocuments(),
                Restaurant.find().sort({ created_at: -1 }).skip(skip).limit(perPage),
            ]);
            res.status(200).json({ message: 'Restaurants retrieved successfully', status: 200, data, pagination: GlobalUtilis.pagination(page, perPage, total) });
        } catch (error) {
            next(error);
        }
    }

    static async getReviews(req: Request, res: Response, next: NextFunction) {
        try {
            const restaurant = await Restaurant.findById(req.params.id, { rating: 1, ratings_count: 1 });
            if (!restaurant) return res.status(404).json({ message: 'Restaurant not found', status: 404 });
            const result = await listReviews(restaurant._id, req.query);
            res.status(200).json({ status: 200, rating: restaurant.rating, ratings_count: restaurant.ratings_count, ...result });
        } catch (error) {
            next(error);
        }
    }
}
