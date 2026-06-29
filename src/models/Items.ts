import * as mongoose from "mongoose";

const ItemsSchema = new mongoose.Schema({
    restaurant_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
       
    },
    category_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        
    },
    name: {
        type: String,
        required: true
    },
    cover: { type: String, required: true },
    vegetarian: { type: Boolean, required: true },
    price: { type: Number, required: true },
    status: {
        type: String,
        default: "active"
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

export default mongoose.model("Items", ItemsSchema);