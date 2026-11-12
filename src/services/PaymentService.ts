import mongoose from "mongoose";
import Order from "../models/Order";
import Payment from "../models/Payment";
import { AppError } from "../Utilis/AppError";
import { sendOrderConfirmationEmail } from "../Utilis/NodeMailer";
import { checkoutUrl, createIntention, paymobConfig, refundTransaction } from "../Utilis/Paymob";
import { transition } from "./OrderTransitions";

export const PAYMENT_WINDOW_MS = 30 * 60 * 1000;

const toCents = (n: number) => Math.round(n * 100);

// Egyptian mobile numbers, stored as +201XXXXXXXXX (the format Paymob expects).
export function normalizePhone(phone: string) {
    const digits = phone.replace(/[\s-]/g, "");
    if (/^\+201[0125]\d{8}$/.test(digits)) return digits;
    if (/^01[0125]\d{8}$/.test(digits)) return `+2${digits}`;
    if (/^201[0125]\d{8}$/.test(digits)) return `+${digits}`;
    return null;
}

function publicUrl() {
    return (process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, "");
}

// Creates a payment attempt and a Paymob intention for an order, and returns the link
// where the customer pays. The amount is built from the order's own items (already priced
// on the server), item by item, so Paymob's "items must add up to the amount" check holds.
export async function startPayment(order: any, user: { _id?: unknown; aud?: string; name: string; email: string }, phone: string) {
    const items = order.items.map((i: any) => ({ name: String(i.name).slice(0, 50), amount: toCents(i.price), quantity: i.quantity }));
    if (order.delivery_charge > 0) items.push({ name: "Delivery", amount: toCents(order.delivery_charge), quantity: 1 });
    const amountCents = items.reduce((sum: number, i: any) => sum + i.amount * i.quantity, 0);

    const payment = await Payment.create({
        order_id: order._id,
        user_id: user._id ?? user.aud,
        amount_cents: amountCents,
        currency: paymobConfig().currency,
    });

    const [first_name, ...rest] = user.name.trim().split(/\s+/);
    try {
        const intention = await createIntention({
            amountCents,
            items,
            billing: { first_name, last_name: rest.join(" ") || "NA", email: user.email, phone_number: phone, street: order.address },
            specialReference: String(payment._id),
            notificationUrl: `${publicUrl()}/api/payments/paymob/webhook`,
            redirectionUrl: `${publicUrl()}/api/payments/paymob/return`,
        });
        await payment.updateOne({ intention_id: intention.id, paymob_order_id: intention.intention_order_id, client_secret: intention.client_secret });
        return { payment_id: String(payment._id), amount_cents: amountCents, checkout_url: checkoutUrl(intention.client_secret) };
    } catch (err) {
        await payment.deleteOne();
        throw err;
    }
}

// What we need from a Paymob transaction, from either the webhook body or the redirect query.
export type Transaction = {
    transactionId: number;
    paymobOrderId?: number;
    merchantReference?: string;
    amountCents: number;
    currency: string;
    success: boolean;
    pending: boolean;
    isRefunded: boolean;
    isVoided: boolean;
    message?: string;
};

const bool = (v: unknown) => v === true || v === "true";

export function fromWebhook(obj: any): Transaction {
    return {
        transactionId: Number(obj.id),
        paymobOrderId: obj.order?.id != null ? Number(obj.order.id) : undefined,
        merchantReference: obj.order?.merchant_order_id ?? obj.special_reference,
        amountCents: Number(obj.amount_cents),
        currency: String(obj.currency),
        success: bool(obj.success),
        pending: bool(obj.pending),
        isRefunded: bool(obj.is_refunded),
        isVoided: bool(obj.is_voided),
        message: obj.data?.message,
    };
}

export function fromRedirect(q: Record<string, any>): Transaction {
    return {
        transactionId: Number(q.id),
        paymobOrderId: q.order != null ? Number(q.order) : undefined,
        merchantReference: q.merchant_order_id,
        amountCents: Number(q.amount_cents),
        currency: String(q.currency),
        success: bool(q.success),
        pending: bool(q.pending),
        isRefunded: bool(q.is_refunded),
        isVoided: bool(q.is_voided),
        message: q["data.message"],
    };
}

async function findPayment(t: Transaction) {
    if (t.merchantReference && mongoose.isValidObjectId(t.merchantReference)) {
        const byRef = await Payment.findById(t.merchantReference);
        if (byRef && (t.paymobOrderId === undefined || byRef.paymob_order_id === t.paymobOrderId)) return byRef;
    }
    return t.paymobOrderId !== undefined ? Payment.findOne({ paymob_order_id: t.paymobOrderId }) : null;
}

export async function refundPayment(payment: any) {
    if (payment.status !== "paid" || !payment.transaction_id) return payment;
    try {
        await refundTransaction(payment.transaction_id, payment.amount_cents);
        await Payment.updateOne({ _id: payment._id }, { status: "refunded", refunded_at: new Date() });
        await Order.updateOne({ _id: payment.order_id }, { refunded: true });
        return { ...payment.toObject(), status: "refunded" };
    } catch (err) {
        // The cancellation still stands; the refund is retried by hand from the Paymob dashboard.
        console.error(`Refund failed for payment ${payment._id}:`, (err as Error).message);
        await Payment.updateOne({ _id: payment._id }, { status: "refund_failed", failure_reason: (err as Error).message });
        return { ...payment.toObject(), status: "refund_failed" };
    }
}

// After an order is cancelled: refund it if it was paid, and close any unfinished attempts.
export async function settleCancelledOrder(orderId: any) {
    await Payment.updateMany({ order_id: orderId, status: "pending" }, { status: "expired" });
    const paid = await Payment.findOne({ order_id: orderId, status: "paid" });
    if (paid) await refundPayment(paid);
}

// Applies a transaction to our data. Safe to call any number of times for the same
// transaction (Paymob retries webhooks, and the redirect may arrive too): only the first
// "paid" write wins, everything after it is a no-op.
export async function processTransaction(t: Transaction) {
    const payment = await findPayment(t);
    if (!payment) return { handled: false, reason: "unknown payment" };

    if (t.amountCents !== payment.amount_cents || t.currency !== payment.currency) {
        console.error(`Paymob amount mismatch for payment ${payment._id}: got ${t.amountCents} ${t.currency}, expected ${payment.amount_cents} ${payment.currency}`);
        return { handled: false, reason: "amount mismatch" };
    }

    if (t.isRefunded || t.isVoided) {
        if (payment.status === "paid") {
            await payment.updateOne({ status: "refunded", refunded_at: new Date() });
            await Order.updateOne({ _id: payment.order_id }, { refunded: true });
        }
        return { handled: true, orderId: String(payment.order_id), status: "refunded" };
    }

    if (t.pending) return { handled: true, orderId: String(payment.order_id), status: "pending" };

    if (!t.success) {
        await Payment.updateOne({ _id: payment._id, status: "pending" }, { status: "failed", transaction_id: t.transactionId, failure_reason: t.message || "Payment declined" });
        return { handled: true, orderId: String(payment.order_id), status: "failed" };
    }

    const paid = await Payment.findOneAndUpdate(
        { _id: payment._id, status: { $in: ["pending", "failed", "expired"] } },
        { status: "paid", transaction_id: t.transactionId, paid_at: new Date(), $unset: { failure_reason: 1 } },
        { new: true },
    );
    if (!paid) return { handled: true, orderId: String(payment.order_id), status: payment.status, duplicate: true };

    try {
        const order = await transition({ _id: payment.order_id }, ["awaiting_payment"], "pending", "payment", {
            extra: { payment_status: true }, notify: false,
        });
        const user: any = order.user_id;
        const restaurant: any = order.restaurant_id;
        void sendOrderConfirmationEmail(user.email, {
            userName: user.name, restaurantName: restaurant.name, items: order.items,
            total: order.total, deliveryCharge: order.delivery_charge, grandTotal: order.grand_total,
        });
        return { handled: true, orderId: String(payment.order_id), status: "paid" };
    } catch (err) {
        // Paid, but the order was cancelled or expired meanwhile (or another attempt already
        // paid it): give the money back instead of keeping it for an order nobody will cook.
        if (err instanceof AppError && err.statusCode === 409) {
            const refunded = await refundPayment(paid);
            return { handled: true, orderId: String(payment.order_id), status: refunded.status };
        }
        throw err;
    }
}

// Card orders that weren't paid within the window are cancelled, so they don't sit
// around forever. Runs on a timer from index.ts; tests call it directly.
export async function expireUnpaidOrders(now = new Date()) {
    const cutoff = new Date(now.getTime() - PAYMENT_WINDOW_MS);
    const stale = await Order.find({ status: "awaiting_payment", created_at: { $lt: cutoff } }, { _id: 1 });
    let expired = 0;
    for (const { _id } of stale) {
        try {
            await transition({ _id }, ["awaiting_payment"], "cancelled", "system", {
                extra: { cancel_reason: "The payment wasn't completed in time" },
            });
            await settleCancelledOrder(_id);
            expired++;
        } catch (err) {
            if (!(err instanceof AppError && err.statusCode === 409)) console.error(`Expiring order ${_id} failed:`, err);
        }
    }
    return expired;
}

export async function startExpiryTimer(everyMs = 5 * 60 * 1000) {
    const timer = setInterval(() => {
        expireUnpaidOrders().catch((err) => console.error("Order expiry failed:", err));
    }, everyMs);
    timer.unref();
    return timer;
}
