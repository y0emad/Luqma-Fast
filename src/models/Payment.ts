import mongoose from "mongoose";

export const PAYMENT_STATUSES = ["pending", "paid", "failed", "expired", "refunded", "refund_failed"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export interface IPayment {
    order_id: mongoose.Types.ObjectId;
    user_id: mongoose.Types.ObjectId;
    provider: "paymob";
    status: PaymentStatus;
    amount_cents: number;
    currency: string;
    intention_id?: string;
    paymob_order_id?: number;
    client_secret?: string;
    transaction_id?: number;
    failure_reason?: string;
    paid_at?: Date;
    refunded_at?: Date;
    created_at: Date;
    updated_at: Date;
}

const PaymentSchema = new mongoose.Schema<IPayment>({
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: "Orders", required: true, index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
    provider: { type: String, enum: ["paymob"], default: "paymob" },
    status: { type: String, enum: PAYMENT_STATUSES, default: "pending" },
    amount_cents: { type: Number, required: true },
    currency: { type: String, required: true },
    intention_id: { type: String },
    paymob_order_id: { type: Number, index: true },
    client_secret: { type: String, select: false },
    transaction_id: { type: Number },
    failure_reason: { type: String },
    paid_at: { type: Date },
    refunded_at: { type: Date },
}, {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
});

export default mongoose.model<IPayment>("Payments", PaymentSchema);
