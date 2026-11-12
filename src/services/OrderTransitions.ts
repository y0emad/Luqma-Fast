import Order from "../models/Order";
import { AppError } from "../Utilis/AppError";
import { sendOrderStatusEmail } from "../Utilis/NodeMailer";
import { STATUS_LABELS, type Actor, type OrderStatus } from "../Utilis/OrderStatus";

type Options = { extra?: Record<string, any>; notify?: boolean };

// Moves an order to `to`, but only if it's still in one of `from` when the write happens.
// Two people acting at the same moment (the user cancels while the restaurant accepts, or
// the payment arrives while the order expires) can't both win: the second write finds the
// status already changed and gets a 409.
export async function transition(filter: Record<string, any>, from: OrderStatus[], to: OrderStatus, by: Actor, { extra = {}, notify = true }: Options = {}) {
    const updated = await Order.findOneAndUpdate(
        { ...filter, status: { $in: from } },
        { $set: { status: to, ...extra }, $push: { status_history: { status: to, by, at: new Date() } } },
        { new: true },
    ).populate("user_id", "name email").populate("restaurant_id", "name");

    if (!updated) {
        const current = await Order.findOne(filter, { status: 1 });
        if (!current) throw new AppError(404, "Order not found");
        throw new AppError(409, `This order is ${current.status.replace(/_/g, " ")} and can't be ${to.replace(/_/g, " ")} now`);
    }

    if (notify) {
        const user: any = updated.user_id;
        const restaurant: any = updated.restaurant_id;
        void sendOrderStatusEmail(user.email, {
            userName: user.name,
            restaurantName: restaurant.name,
            orderId: String(updated._id),
            statusLabel: STATUS_LABELS[to],
            reason: (extra.cancel_reason as string) || undefined,
        });
    }
    return updated;
}
