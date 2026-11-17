import mongoose from "mongoose";


const CitySchema = new mongoose.Schema({

    name: {
        type: String,
        required: true
    },
    lat: {
        type: Number,
        required: true},
    lon: {
        type: Number,
        required: true
    },
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

export default mongoose.model("City", CitySchema);

