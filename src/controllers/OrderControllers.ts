import type { NextFunction, Request, Response } from "express";
import Order from "../models/Order";
import Items from "../models/Items";
import { GlobalUtilis } from "../Utilis/GlobalUtilis";
import { AppError } from "../Utilis/AppError";
import { sendOrderConfirmationEmail } from "../Utilis/NodeMailer";
import { isPaymobConfigured } from "../Utilis/Paymob";
import { transition } from "../services/OrderTransitions";
import { normalizePhone, settleCancelledOrder, startPayment, PAYMENT_WINDOW_MS } from "../services/PaymentService";
import Payment from "../models/Payment";
import { addReview } from "../services/ReviewService";
import { isOpenAt } from "../Utilis/OpeningHours";
import { canRestaurantMove, ORDER_STATUSES, USER_CANCELLABLE, type Actor, type OrderStatus } from "../Utilis/OrderStatus";

const round2 = (n: number) => Math.round(n * 100) / 100;

export class OrderControllers {
    static async createOrder(req: Request, res: Response, next: NextFunction) {
        try {
            const restaurant = req.restaurant;
            if (!isOpenAt(restaurant)) {
                throw new AppError(422, `${restaurant.name} is closed right now (open ${restaurant.opening_time}–${restaurant.closing_time})`);
            }
            const { address, payment_method } = req.body;
            const isCard = payment_method === 'card';
            if (isCard && !isPaymobConfigured()) {
                throw new AppError(503, 'Online payment is not available right now, please pay cash');
            }
            const phone = (req.body.phone && normalizePhone(req.body.phone)) || undefined;
            const instructions = req.body.instructions || "";
            const requested: { item_id: string, quantity: number }[] = req.body.items;

            const quantities = new Map<string, number>();
            for (const { item_id, quantity } of requested) {
                quantities.set(item_id, (quantities.get(item_id) || 0) + quantity);
            }

            const items = await Items.find({
                _id: { $in: [...quantities.keys()] },
                restaurant_id: restaurant._id,
                status: 'active'
            });
            if (items.length !== quantities.size) {
                throw new AppError(422, 'Some items are unavailable or do not belong to this restaurant');
            }

            const orderItems = items.map(item => ({
                item_id: item._id,
                name: item.name,
                price: item.price,
                quantity: quantities.get(item._id.toString())!
            }));
            const total = round2(orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0));
            const delivery_charge = restaurant.delivery_fee;
            const grand_total = round2(total + delivery_charge);

            const data = await Order.create({
                restaurant_id: restaurant._id,
                user_id: req.user!.aud,
                instructions,
                address,
                items: orderItems,
                total,
                delivery_charge,
                grand_total,
                payment_status: false,
                payment_method,
                phone,
                status: isCard ? 'awaiting_payment' : 'pending',
                status_history: [{ status: isCard ? 'awaiting_payment' : 'pending', by: 'user' }],
            });

            if (isCard) {
                try {
                    const payment = await startPayment(data, req.user!, phone!);
                    return res.status(201).json({
                        message: 'Order created, complete the payment to send it to the restaurant', status: 201, data,
                        payment: { ...payment, expires_in_minutes: PAYMENT_WINDOW_MS / 60000 },
                    });
                } catch (err) {
                    await data.deleteOne();
                    throw err;
                }
            }

            res.status(201).json({ message: 'Order created successfully', status: 201, data });

            void sendOrderConfirmationEmail(req.user!.email, {
                userName: req.user!.name,
                restaurantName: restaurant.name,
                items: orderItems,
                total,
                deliveryCharge: delivery_charge,
                grandTotal: grand_total,
            });
        } catch (error) {
            next(error);
        }
    }

    static async getOrder(req: Request, res: Response, next: NextFunction) {
        try {
            const filter: Record<string, any> = { user_id: req.user!.aud };
            if (ORDER_STATUSES.includes(req.query.status as OrderStatus)) filter.status = req.query.status;
            const { page, perPage, skip } = GlobalUtilis.pageParams(req.query);
            const [total, data] = await Promise.all([
                Order.countDocuments(filter),
                Order.find(filter)
                    .sort({ created_at: -1 })
                    .skip(skip)
                    .limit(perPage)
                    .populate('restaurant_id', 'name restaurantImg address'),
            ]);
            res.status(200).json({ message: 'Orders retrieved successfully', status: 200, data, pagination: GlobalUtilis.pagination(page, perPage, total) });
        } catch (error) {
            next(error);
        }
    }

    static async getOrderById(req: Request, res: Response, next: NextFunction) {
        try {
            const order = await Order.findById(req.params.id)
                .populate('restaurant_id', 'name restaurantImg address user_id')
                .populate('user_id', 'name email');
            const user = req.user!;
            const isCustomer = String((order?.user_id as any)?._id) === user.aud;
            const isRestaurant = user.type === 'restaurant' && String((order?.restaurant_id as any)?.user_id) === user.aud;
            if (!order || !(isCustomer || isRestaurant || user.type === 'admin')) {
                throw new AppError(404, 'Order not found');
            }
            res.status(200).json({ message: 'Order retrieved successfully', status: 200, data: order });
        } catch (error) {
            next(error);
        }
    }

    static async cancelOrder(req: Request, res: Response, next: NextFunction) {
        try {
            const data = await transition(
                { _id: req.params.id, user_id: req.user!.aud },
                USER_CANCELLABLE, 'cancelled', 'user',
                { extra: { cancel_reason: req.body?.reason || 'Cancelled by the customer' } },
            );
            await settleCancelledOrder(data._id);
            res.status(200).json({ message: 'Order cancelled', status: 200, data });
        } catch (error) {
            next(error);
        }
    }

    static async updateStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const to = req.body.status as OrderStatus;
            const from = ORDER_STATUSES.filter((s) => canRestaurantMove(s, to));
            const by: Actor = req.user!.type === 'admin' ? 'admin' : 'restaurant';
            const filter: Record<string, any> = { _id: req.params.id };
            if (by === 'restaurant') filter.restaurant_id = req.restaurant._id;

            const extra: Record<string, any> = {};
            if (to === 'cancelled') extra.cancel_reason = req.body.reason || 'Cancelled by the restaurant';
            if (to === 'delivered') {
                const order = await Order.findOne(filter, { payment_method: 1 });
                if (order?.payment_method === 'cash') extra.payment_status = true;
            }

            const data = await transition(filter, from, to, by, { extra });
            if (to === 'cancelled') await settleCancelledOrder(data._id);
            res.status(200).json({ message: `Order is now ${to}`, status: 200, data });
        } catch (error) {
            next(error);
        }
    }

    static async payOrder(req: Request, res: Response, next: NextFunction) {
        try {
            if (!isPaymobConfigured()) throw new AppError(503, 'Online payment is not available right now');
            const order = await Order.findOne({ _id: req.params.id, user_id: req.user!.aud });
            if (!order) throw new AppError(404, 'Order not found');
            if (order.status !== 'awaiting_payment') throw new AppError(409, 'This order is not waiting for a payment');
            if (order.created_at.getTime() < Date.now() - PAYMENT_WINDOW_MS) {
                throw new AppError(409, 'The time to pay this order is over, please order again');
            }
            const phone = req.body?.phone ? normalizePhone(req.body.phone) : order.phone;
            if (!phone) throw new AppError(422, 'A valid Egyptian mobile number is required');
            await Payment.updateMany({ order_id: order._id, status: 'pending' }, { status: 'expired' });
            const payment = await startPayment(order, req.user!, phone);
            res.status(201).json({ message: 'Payment link created', status: 201, payment });
        } catch (error) {
            next(error);
        }
    }

    static async getPayments(req: Request, res: Response, next: NextFunction) {
        try {
            const order = await Order.exists({ _id: req.params.id, user_id: req.user!.aud });
            if (!order) throw new AppError(404, 'Order not found');
            const data = await Payment.find({ order_id: req.params.id }).sort({ created_at: -1 });
            res.status(200).json({ status: 200, data });
        } catch (error) {
            next(error);
        }
    }

    static async reviewOrder(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await addReview(String(req.params.id), req.user!.aud, Number(req.body.rating), req.body.comment);
            res.status(201).json({ message: 'Thanks for your rating', status: 201, data: result.review, restaurant: result.restaurant });
        } catch (error) {
            next(error);
        }
    }
}
