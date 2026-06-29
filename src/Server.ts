import * as dotenv from 'dotenv';

import express from 'express';
import * as mongoose from 'mongoose';
import { getEnvironment } from './environments/environment';
import UserRouter from "./routers/UserRouter";
import * as bodyParser from 'body-parser';
import cors from 'cors';
import BannerRouter from './routers/BannerRouter';
import CityRouter from './routers/CityRouter';
import RestaurantRouter from './routers/RestaurantRouter';
import CategoryRouter from './routers/CategoryRouter';
import ItemsRouter from './routers/ItemsRouter';
import AddressRouter from './routers/AddressRouter';
import OrderRouter from './routers/OrderRouter';
import { Redis } from './Utilis/Redis';
export class Server {
    public app: express.Application = express();
    constructor() {
        this.setConfig();
        this.setRoutes();
        this.err404Handler();
        this.errHandler();
        this.allowCors();

    }

    setConfig() {
        // this.dotEnvConfig();
        this.connectMongoDb();
        this.connectRedis();
        this.allowCors();
        this.configBodyParser();
    }


    // dotEnvConfig() {
    //     dotenv.config({ path: './.env' });
    // }

    connectMongoDb() {
        mongoose.connect(getEnvironment().db_uri).then(() => {
            console.log('Connected to MongoDB');
        }).catch((error) => {
            console.error('Error connecting to MongoDB:', error);
        });

    }
    connectRedis() {
        Redis.connect();
    }
    configBodyParser() {

        this.app.use(bodyParser.urlencoded({ extended: true }));
    }
    allowCors() {
        this.app.use(cors());
    }
    setRoutes() {
        this.app.use("/src/uploads", express.static('src/uploads'));
        this.app.use('/users', UserRouter);
        this.app.use('/banner', BannerRouter);
        this.app.use('/city', CityRouter);
        this.app.use('/restaurants', RestaurantRouter);
        this.app.use('/categories', CategoryRouter);
        this.app.use('/items', ItemsRouter);
        this.app.use('/addresses', AddressRouter);
        this.app.use('/orders', OrderRouter);

    }

    err404Handler() {
        this.app.use((req, res, next) => {
            res.status(404).json({ message: 'Not Found', status: 404 });
        });
    }
    errHandler() {
        this.app.use((error: any, req: any, res: any, next: any) => {
            const error_message = error.message || 'Something went wrong';
            const status_code = error.statusCode || 500;
            res.status(status_code).json({ message: error_message, status: status_code });
        });
    }


}