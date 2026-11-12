import 'dotenv/config';
import mongoose from 'mongoose';
import { assertEnvironment, getEnvironment } from './environments/environment';
import { Redis } from './Utilis/Redis';
import { createApp } from './app';
import { startExpiryTimer } from './services/PaymentService';
import { isPaymobConfigured } from './Utilis/Paymob';

async function start() {
    try {
        assertEnvironment();
    } catch (err) {
        console.error((err as Error).message);
        process.exit(1);
    }

    const env = getEnvironment();

    try {
        await mongoose.connect(env.mongoUri);
        console.log('Connected to MongoDB');
        await Redis.connect();
        console.log('Connected to Redis');
    } catch (err) {
        console.error('Startup failed:', (err as Error).message);
        process.exit(1);
    }

    const server = createApp().listen(env.port, () => {
        console.log(`Server is running on port ${env.port}`);
        console.log(isPaymobConfigured() ? 'Online payment: Paymob enabled' : 'Online payment: off (PAYMOB_* not set), cash only');
    });
    startExpiryTimer();

    const shutdown = async (signal: string) => {
        console.log(`${signal} received, shutting down`);
        server.close();
        await Promise.allSettled([mongoose.disconnect(), Redis.disconnect()]);
        process.exit(0);
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
