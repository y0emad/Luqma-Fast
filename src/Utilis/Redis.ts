import { createClient } from 'redis';
import { getEnvironment } from '../environments/environment';
import { error } from 'node:console';
export const client = createClient({
    // url: getEnvironment().local_redis?.url,
    socket: {
        host: getEnvironment().local_redis?.host,
        port: getEnvironment().local_redis?.port
    },

    // username: getEnvironment().local_redis?.username,
    // password: getEnvironment().local_redis?.password



});

export class Redis {

    static async connect() {
        // this.client.on('error', (err) => console.log('Redis Client Error', err));

        try {
            await client.connect();
            console.log('Connected to Redis');
        } catch (err) {
            console.error('Failed to connect to Redis:', err);
        }

    }


    static async setRedis(key: string, value: string, expiryInSeconds?: number) {
        try {
            const option = expiryInSeconds ? { EX: expiryInSeconds } : undefined;
            await client.set(key, value, option);
        } catch (err) {

            throw new Error(`Failed to set Redis key: ${(err as Error).message}`);
        }
    }


    static async get(key: string) {
        try {
            const value = await client.get(key);
            return value;
        } catch (err) {
            throw new Error(`Failed to get Redis key: ${(err as Error).message}`);
        }
    }

    static async del(key: string) {
        try {
            await client.del(key);
        } catch (err) {
            throw new Error(`Failed to delete Redis key: ${(err as Error).message}`);
        }
    }
}
