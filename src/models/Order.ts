import * as mongoose from "mongoose";


const OrderSchema = new mongoose.Schema({
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
        default: "pending"
    },
    address: {
        type: String,
        required: true
    },
    order: {
        type: String,
        required: true
    },
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
        required: true
    },

    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model("Orders", OrderSchema);

