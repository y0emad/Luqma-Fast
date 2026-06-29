import * as mongoose from "mongoose";


const bannerSchema = new mongoose.Schema({
    banner: {
        type: String,
        required: true
    },
    restaurant_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "restaurant",

    },
    isShow: {
        type: Number,
        default: 1
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

export default mongoose.model("banner", bannerSchema);

