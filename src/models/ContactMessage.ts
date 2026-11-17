import mongoose from "mongoose";

export interface IContactMessage {
    name: string;
    email: string;
    subject: 'order' | 'restaurant' | 'payment' | 'other';
    message: string;
    order_ref?: string;
    user_id?: mongoose.Types.ObjectId;
    read: boolean;
    created_at: Date;
    updated_at: Date;
}

const ContactMessageSchema = new mongoose.Schema<IContactMessage>({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    subject: { type: String, enum: ['order', 'restaurant', 'payment', 'other'], default: 'other' },
    message: { type: String, required: true, maxlength: 2000 },
    order_ref: { type: String, maxlength: 30 },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
    read: { type: Boolean, default: false },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

ContactMessageSchema.index({ read: 1, created_at: -1 });

export default mongoose.model<IContactMessage>("ContactMessages", ContactMessageSchema);
