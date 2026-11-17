import mongoose from "mongoose";


const restaurantSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true
    },
    city_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "City",
        required: true
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    address: {
        type: String,
        required: true
    },

    location: {
        type: Object,
        required: true
    },
    cuisines: {
        type: Array,
        required: true
    },
    opening_time: {
        type: String,
        required: true
    },
    closing_time: {
        type: String,
        required: true
    },
    restaurantImg: {
        type: String,
    },
    delivery_time: {
        type: String,
        required: true
    },
    delivery_fee: {
        type: Number,
        required: true
    },
    rating: {
        type: Number,
        default: 0
    },
    ratings_count: {
        type: Number,
        default: 0
    },
    isClosed: {
        type: Boolean,
        default: false
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

restaurantSchema.index({ location: '2dsphere' });

export default mongoose.model("restaurant", restaurantSchema);

