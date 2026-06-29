import Category from "../models/Category";



export class CategoryControllers {


    static async getCategory(req: any, res: any, next: any) {
        try {
            const categories = await Category.find({ restaurant_id: req.params.restaurant_id }, { __v: 0 });
            res.status(200).json({ message: 'Categories retrieved successfully', status: 200, data: categories });
        } catch (error) {
            next(error);
        }
    }
}
