import { existsSync } from 'fs';
import path from 'path';
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
import ContactRouter from './routers/ContactRouter';
import { Redis } from './Utilis/Redis';
import { apiLimiter } from './middleware/rateLimit';
import { errorHandler, notFound } from './middleware/errorHandler';

export function createApp() {
    const env = getEnvironment();
    const app = express();

    if (env.trustProxy) app.set('trust proxy', 1);

    const httpsOnly = process.env.HTTPS_ONLY === 'true';
    app.use(helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        contentSecurityPolicy: {
            directives: {
                upgradeInsecureRequests: httpsOnly ? [] : null,
                imgSrc: ["'self'", 'data:', 'blob:', 'https://*.tile.openstreetmap.org'],
                connectSrc: ["'self'", 'https://nominatim.openstreetmap.org'],
            },
        },
    }));
    app.use(cors({ origin: env.frontendUrls }));
    app.use(express.json({ limit: '100kb' }));
    app.use(express.urlencoded({ extended: true, limit: '100kb' }));

    app.get('/health', async (_req, res) => {
        const mongo = mongoose.connection.readyState === 1;
        const redis = await Redis.ping().catch(() => false);
        res.status(mongo && redis ? 200 : 503).json({ status: mongo && redis ? 'ok' : 'degraded', mongo, redis });
    });

    app.use('/uploads', express.static('src/uploads', { maxAge: '7d' }));
    app.use('/src/uploads', express.static('src/uploads', { maxAge: '7d' }));

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
    api.use('/contact', ContactRouter);
    api.use(notFound);
    app.use('/api', api);

    const clientDist = path.resolve(process.env.CLIENT_DIST ?? 'client/dist');
    if (existsSync(path.join(clientDist, 'index.html'))) {
        app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
        app.get('/{*path}', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
    }

    app.use(notFound);
    app.use(errorHandler);
    return app;
}
