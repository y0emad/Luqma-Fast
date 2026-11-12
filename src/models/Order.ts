import mongoose from "mongoose";
import { ACTORS, ORDER_STATUSES, type Actor, type OrderStatus } from "../Utilis/OrderStatus";

export interface IOrder {
    user_id: mongoose.Types.ObjectId;
    restaurant_id: mongoose.Types.ObjectId;
    instructions?: string;
    status: OrderStatus;
    status_history: { status: OrderStatus; at: Date; by: Actor }[];
    phone?: string;
    refunded: boolean;
    cancel_reason?: string;
    address: string;
    order?: string;
    items: { item_id: mongoose.Types.ObjectId; name: string; price: number; quantity: number }[];
    total: number;
    grand_total: number;
    delivery_charge: number;
    payment_status: boolean;
    payment_method: 'cash' | 'card';
    created_at: Date;
    updated_at: Date;
}

const OrderSchema = new mongoose.Schema<IOrder>({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true
    },
    restaurant_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "restaurant",
        required: true
    },
    instructions: {
        type: String,
    },
    status: {
        type: String,
        enum: ORDER_STATUSES,
        default: "pending"
    },
    status_history: [{
        _id: false,
        status: { type: String, enum: ORDER_STATUSES, required: true },
        at: { type: Date, default: Date.now },
        by: { type: String, enum: ACTORS, required: true },
    }],
    cancel_reason: {
        type: String
    },
    phone: {
        type: String
    },
    refunded: {
        type: Boolean,
        default: false
    },
    address: {
        type: String,
        required: true
    },
    order: {
        type: String
    },
    items: [{
        _id: false,
        item_id: { type: mongoose.Schema.Types.ObjectId, ref: "Items", required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true }
    }],
    total: {
        type: Number,
        required: true
    },
    grand_total: {
        type: Number,
        required: true
    },
    delivery_charge: {
        type: Number,
        required: true
    },
    payment_status: {
        type: Boolean,
        required: true
    },
    payment_method: {
        type: String,
        enum: ["cash", "card"],
        required: true
    },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

OrderSchema.index({ restaurant_id: 1, created_at: -1 });
OrderSchema.index({ user_id: 1, created_at: -1 });

export default mongoose.model<IOrder>("Orders", OrderSchema);
