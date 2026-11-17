import mongoose from "mongoose";

export interface IUser {
    name: string;
    email: string;
    password: string;
    type: 'user' | 'admin' | 'restaurant';
    photo: string;
    status: string;
    verified: boolean;
    verification_token?: string | null;
    verification_time?: Date | null;
    verification_attempts: number;
    verification_resetPass_token?: string | null;
    verification_resetPass_time?: Date | null;
    verification_resetPass_attempts: number;
    created_at: Date;
    updated_at: Date;
}

const usersSchema = new mongoose.Schema<IUser>({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['user', 'admin', 'restaurant'],
        default: 'user',
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
    verified: {
        type: Boolean,
        default: false
    },
    verification_token: { type: String },
    verification_time: { type: Date },
    verification_attempts: { type: Number, default: 0 },
    verification_resetPass_token: { type: String },
    verification_resetPass_time: { type: Date },
    verification_resetPass_attempts: { type: Number, default: 0 },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: {
        transform: (_doc, ret: any) => {
            delete ret.password;
            delete ret.verification_token;
            delete ret.verification_time;
            delete ret.verification_attempts;
            delete ret.verification_resetPass_token;
            delete ret.verification_resetPass_time;
            delete ret.verification_resetPass_attempts;
            delete ret.__v;
            return ret;
        }
    }
});

export default mongoose.model<IUser>("users", usersSchema);
