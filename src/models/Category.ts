import mongoose from "mongoose";


const categorySchema = new mongoose.Schema({
    restaurant_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "restaurant",
        required: true
    },
    name: {
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

export default mongoose.model("Category", categorySchema);

