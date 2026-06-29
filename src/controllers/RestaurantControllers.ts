
import { glob } from "fs/promises";
import Category from "../models/Category";
import City from "../models/City";
import Restaurant from "../models/Restaurant";
import User from "../models/User";
import { GlobalUtilis } from "../Utilis/GlobalUtilis";

export class RestaurantControllers {
    static async createRestaurant(req: any, res: any, next: any) {
        try {
            const cuisines = JSON.parse(req.body.cuisines);
            const { city_id, name, location, address, opening_time, closing_time, delivery_time, delivery_fee } = req.body;
            // create user for restaurant
            const hashedPassword = await GlobalUtilis.hashPassword(req.body.password);
            const token = await GlobalUtilis.generateOtp();
            const user = new User({ name, email: req.body.email, password: hashedPassword, type: 'restaurant', verification_token: token, verification_time: new Date(Date.now() + GlobalUtilis.timeOfOtpValidity), created_at: new Date(), updated_at: new Date() });
            await user.save();

            // create restaurant

            const newRestaurant = new Restaurant({ city_id, address, user_id: user._id, restaurantImg: req.file?.path, name, location: JSON.parse(req.body.location), cuisines, opening_time, closing_time, delivery_time, delivery_fee, created_at: new Date(), updated_at: new Date() });
            await newRestaurant.save();
            // #create category for each cuisine

            const category = cuisines.map((cuisine: string) => { return new Category({ restaurant_id: newRestaurant._id, name: cuisine, created_at: new Date(), updated_at: new Date() }).save(); });
            console.log(category);
            res.status(200).json({ message: 'Restaurant created successfully', status: 200 });
        } catch (error) {
            next(error);
        }



    }


    static async getNearbyRestaurants(req: any, res: any, next: any) {

        const METERS_PER_KM = 6378.1;
        const METERS_PER_MILE = 1609.34
        const userId = req.user.aud;
        const perPage = 5;
        const currentPage = parseInt(req.query.page) || 1;
        let nextPage: any = currentPage + 1;
        const prevPage = currentPage == 1 ? null : currentPage - 1;
        try {
            const { latitude, longitude, radius } = req.query;
            const geoWithinQuery = {
                location: {
                    $geoWithin: {
                        $centerSphere: [[parseFloat(longitude), parseFloat(latitude)], parseFloat(radius) / METERS_PER_KM]
                    }
                }
            };
            const totalAddresses = await Restaurant.countDocuments(geoWithinQuery);
            const totalPages = Math.ceil(totalAddresses / perPage);
            if (totalPages == 0 || currentPage == totalPages) {

                nextPage = null;
            }
            if (currentPage > totalPages) {
                return res.status(404).json({ message: 'Page not found', status: 404 });
            }

            const nearbyRestaurants = await Restaurant.find({
                location: { $nearSphere: { $geometry: { type: "Point", coordinates: [parseFloat(longitude), parseFloat(latitude)] }, $maxDistance: parseFloat(radius) * METERS_PER_KM } }
            }).skip((currentPage * perPage) - perPage).limit(perPage);
            res.status(200).json({ message: 'Nearby restaurants retrieved successfully', status: 200, data: nearbyRestaurants, pagination: { page: currentPage, perPage, totalPages, totalAddresses, nextPage, prevPage } });
        } catch (error) {
            next(error);
        }
    }

    static async searchNearbyRestaurants(req: any, res: any, next: any) {
        const METERS_PER_MILE = 1609.34
        const METERS_PER_KM = 6378.1;
        const userId = req.user.aud;
        const perPage = 5;
        const currentPage = parseInt(req.query.page) || 1;
        let nextPage: any = currentPage + 1;
        const prevPage = currentPage == 1 ? null : currentPage - 1;
        try {
            const { latitude, longitude, radius, name } = req.query;
            const geoWithinQueryAndName = {
                name: { $regex: name, $options: 'i' },
                location: {
                    $geoWithin: {
                        $centerSphere: [[parseFloat(longitude), parseFloat(latitude)], parseFloat(radius) / METERS_PER_KM]
                    }
                }
            };
            const totalAddresses = await Restaurant.countDocuments(geoWithinQueryAndName);
            const totalPages = Math.ceil(totalAddresses / perPage);
            if (totalPages == 0 || currentPage == totalPages) {

                nextPage = null;
            }
            if (currentPage > totalPages) {
                return res.status(404).json({ message: 'Page not found', status: 404 });
            }

            const nearbyRestaurants = await Restaurant.find({
                name: { $regex: name, $options: 'i' },
                location: { $nearSphere: { $geometry: { type: "Point", coordinates: [parseFloat(longitude), parseFloat(latitude)] }, $maxDistance: parseFloat(radius) * METERS_PER_KM } }
            }).skip((currentPage * perPage) - perPage).limit(perPage);
            res.status(200).json({ message: 'Nearby restaurants retrieved successfully', status: 200, data: nearbyRestaurants, pagination: { page: currentPage, perPage, totalPages, totalAddresses, nextPage, prevPage } });
        } catch (error) {
            next(error);
        }
    }



    static async getRestaurants(req: any, res: any, next: any) {
        const userId = req.user.aud;
        const perPage = 5;
        const currentPage = parseInt(req.query.page) || 1;
        let nextPage: any = currentPage + 1;
        const prevPage = currentPage == 1 ? null : currentPage - 1;
        try {
            const totalAddresses = await Restaurant.countDocuments({ isClosed: false });
            const totalPages = Math.ceil(totalAddresses / perPage);
            if (totalPages == 0 || currentPage == totalPages) {

                nextPage = null;
            }
            if (currentPage > totalPages) {
                return res.status(404).json({ message: 'Page not found', status: 404 });
            }
            const restaurants = await Restaurant.find({ isClosed: false }).skip((currentPage * perPage) - perPage).limit(perPage);
            res.status(200).json({ message: 'Restaurants retrieved successfully', status: 200, data: restaurants, pagination: { page: currentPage, perPage, totalPages, totalAddresses, nextPage, prevPage } });
        } catch (error) {
            next(error);
        }
    }

}
