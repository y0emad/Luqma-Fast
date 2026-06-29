import Order from "../models/Order";
import Restaurant from "../models/Restaurant";


export class OrderControllers {
    static async createOrder(req: any, res: any, next: any) {
        try {
            const userId = req.user.aud;


            let { restaurant_id, instructions, address, order, total, grand_total, delivery_charge, payment_status, payment_method } = req.body;
            instructions = instructions ? instructions : "";


            const newOrder = new Order({ restaurant_id, instructions, address, order, total, grand_total, delivery_charge, payment_status, payment_method, user_id: userId });
            await newOrder.save();
            res.status(200).json({ message: 'Order created successfully', status: 200 });
        } catch (error) {
            next(error);
        }
    }

    static async getOrder(req: any, res: any, next: any) {
        const userId = req.user.aud;
        const perPage = 5;
        const currentPage = parseInt(req.query.page) || 1;
        let nextPage: any = currentPage + 1;
        const prevPage = currentPage == 1 ? null : currentPage - 1;
        try {
            const totalAddresses = await Order.countDocuments({ user_id: userId });
            const totalPages = Math.ceil(totalAddresses / perPage);
            if (totalPages == 0 || currentPage == totalPages) {

                nextPage = null;
            }
            if (currentPage > totalPages) {
                return res.status(404).json({ message: 'Page not found', status: 404 });
            }

            const orders = await Order.find({ user_id: userId })
                .skip((currentPage * perPage) - perPage)
                .limit(perPage)
                .populate('restaurant_id')
                .sort({ created_at: -1 })
                .exec();

            if (!orders.length) {
                return res.status(404).json({ message: 'No orders found', status: 404 });
            }

            res.status(200).json({ message: 'Orders retrieved successfully', status: 200, data: orders, pagination: { page: currentPage, perPage, totalPages, totalAddresses, nextPage, prevPage } });
        } catch (error) {
            next(error);
        }
    }


}