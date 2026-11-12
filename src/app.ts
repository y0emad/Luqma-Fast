import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { getEnvironment } from './environments/environment';
import UserRouter from "./routers/UserRouter";
import BannerRouter from './routers/BannerRouter';
import CityRouter from './routers/CityRouter';
import RestaurantRouter from './routers/RestaurantRouter';
import CategoryRouter from './routers/CategoryRouter';
import ItemsRouter from './routers/ItemsRouter';
import AddressRouter from './routers/AddressRouter';
import OrderRouter from './routers/OrderRouter';
import DashboardRouter from './routers/DashboardRouter';
import PaymentRouter from './routers/PaymentRouter';
import { Redis } from './Utilis/Redis';
import { apiLimiter } from './middleware/rateLimit';
import { errorHandler, notFound } from './middleware/errorHandler';

// The Express app only (no listen, no DB connect), so tests can use it with Supertest.
export function createApp() {
    const env = getEnvironment();
    const app = express();

    // Behind a reverse proxy (Caddy) trust its X-Forwarded-For, so rate limits see the real visitor.
    if (env.trustProxy) app.set('trust proxy', 1);

    app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
    app.use(cors({ origin: env.frontendUrls }));
    app.use(express.json({ limit: '100kb' }));
    app.use(express.urlencoded({ extended: true, limit: '100kb' }));

    app.get('/health', async (_req, res) => {
        const mongo = mongoose.connection.readyState === 1;
        const redis = await Redis.ping().catch(() => false);
        res.status(mongo && redis ? 200 : 503).json({ status: mongo && redis ? 'ok' : 'degraded', mongo, redis });
    });

    app.use('/src/uploads', express.static('src/uploads', { maxAge: '7d' }));

    // Paymob calls these: no rate limit, no token (they are checked by their HMAC).
    app.use('/api/payments', PaymentRouter);

    const api = express.Router();
    api.use(apiLimiter);
    api.use('/users', UserRouter);
    api.use('/banner', BannerRouter);
    api.use('/city', CityRouter);
    api.use('/restaurants', RestaurantRouter);
    api.use('/categories', CategoryRouter);
    api.use('/items', ItemsRouter);
    api.use('/addresses', AddressRouter);
    api.use('/orders', OrderRouter);
    api.use('/my-restaurant', DashboardRouter);
    app.use('/api', api);

    app.use(notFound);
    app.use(errorHandler);
    return app;
}
