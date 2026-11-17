import mongoose from "mongoose";
import Order from "../models/Order";
import Restaurant from "../models/Restaurant";
import { AppError } from "../Utilis/AppError";
import { GlobalUtilis } from "../Utilis/GlobalUtilis";

const round1 = (n: number) => Math.round(n * 10) / 10;

export async function recomputeRating(restaurantId: unknown) {
    const id = new mongoose.Types.ObjectId(String(restaurantId));
    const [row] = await Order.aggregate([
        { $match: { restaurant_id: id, 'review.rating': { $exists: true } } },
        { $group: { _id: null, avg: { $avg: '$review.rating' }, count: { $sum: 1 } } },
    ]);
    const rating = row ? round1(row.avg) : 0;
    const ratings_count = row?.count ?? 0;
    await Restaurant.updateOne({ _id: id }, { rating, ratings_count });
    return { rating, ratings_count };
}

export async function addReview(orderId: string, userId: string, rating: number, comment?: string) {
    const review = { rating, comment: comment?.trim() || undefined, created_at: new Date() };
    const updated = await Order.findOneAndUpdate(
        { _id: orderId, user_id: userId, status: 'delivered', 'review.rating': { $exists: false } },
        { $set: { review } },
        { new: true },
    );
    if (!updated) {
        const order = await Order.findOne({ _id: orderId, user_id: userId }, { status: 1, review: 1 });
        if (!order) throw new AppError(404, 'Order not found');
        if (order.review?.rating) throw new AppError(409, 'You already rated this order');
        throw new AppError(409, 'You can rate an order once it is delivered');
    }
    const summary = await recomputeRating(updated.restaurant_id);
    return { review: updated.review, restaurant: summary };
}

export async function listReviews(restaurantId: unknown, query: any) {
    const id = new mongoose.Types.ObjectId(String(restaurantId));
    const filter = { restaurant_id: id, 'review.rating': { $exists: true } };
    const { page, perPage, skip } = GlobalUtilis.pageParams(query, 10);
    const [total, rows, breakdownRows] = await Promise.all([
        Order.countDocuments(filter),
        Order.find(filter, { review: 1, user_id: 1, items: 1 })
            .sort({ 'review.created_at': -1 })
            .skip(skip)
            .limit(perPage)
            .populate('user_id', 'name'),
        Order.aggregate([{ $match: filter }, { $group: { _id: '$review.rating', count: { $sum: 1 } } }]),
    ]);
    const breakdown = Object.fromEntries([1, 2, 3, 4, 5].map((n) => [n, 0])) as Record<number, number>;
    for (const r of breakdownRows) breakdown[r._id] = r.count;
    const data = rows.map((o: any) => ({
        _id: String(o._id),
        rating: o.review.rating,
        comment: o.review.comment ?? null,
        created_at: o.review.created_at,
        author: String(o.user_id?.name ?? '').split(' ')[0] || null,
        items: o.items.map((i: any) => i.name),
    }));
    return { data, breakdown, pagination: GlobalUtilis.pagination(page, perPage, total) };
}
