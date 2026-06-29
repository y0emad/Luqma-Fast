
import City from "../models/City";

export class CityControllers {
    static async createCity(req: any, res: any, next: any) {
        try {
            const { name, lon, lat  } = req.body;
            const newCity = new City({ name, lon, lat });
            await newCity.save();
            res.status(200).json({ message: 'City created successfully', status: 200 });
        } catch (error) {
            next(error);
        }
    }

    static async getCity(req: any, res: any, next: any) {
        try {
            const cities = await City.find();
            res.status(200).json({ message: 'Cities retrieved successfully', status: 200, data: cities });
        } catch (error) {
            next(error);
        }
    }
}
            