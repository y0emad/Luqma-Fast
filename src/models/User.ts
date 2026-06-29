import * as mongoose from "mongoose";


const usersSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true,
    },
    photo: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        default: 'active'
    },
    verification_token: {
        type: String,

    },
    verification_time: {
        type: Date,
    },
    verification_resetPass_token: {
        type: String,

    },
    verification_resetPass_time: {
        type: Date,
    },
    verified: {
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

export default mongoose.model("users", usersSchema);

