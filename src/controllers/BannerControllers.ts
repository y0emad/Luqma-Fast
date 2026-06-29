import Banner from "../models/Banner";

export class BannerControllers {
    static async addBanner(req: any, res: any, next: any) {
        try {

            let data: any = { banner: req.file.path };
            const restaurant_id = req.body.restaurant_id;
            if (restaurant_id) {
                data = { ...data, restaurant_id };
            }
            const newBanner = new Banner(data);
            await newBanner.save();
            res.status(200).json({ message: 'Banner added successfully', status: 200 });
        } catch (error) {
            next(error);
        }
    }


    static async getBanner(req: any, res: any, next: any) {
        try {
            const banners = await Banner.find();

            res.status(200).json({ message: 'Banners retrieved successfully', status: 200, data: banners });
        } catch (error) {
            next(error);
        }
    }
    static async addManyBanner(req: any, res: any, next: any) {
        try {

            const bannerFiles = req.files as Express.Multer.File[];
            const bannerPaths = bannerFiles.map(file => file.path);
            const bannerDocs = bannerPaths.map(path => ({ banner: path }));
            await Banner.insertMany(bannerDocs);
            res.status(200).json({ message: 'Banners added successfully', status: 200 });
        } catch (error) {
            next(error);
        }
    }
}