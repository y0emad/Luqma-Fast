import { createClient } from 'redis';

let client: ReturnType<typeof createClient> | undefined;
let everConnected = false;

// Created on first use, so the env (REDIS_URL) is already loaded.
// The first connection gives up after a few tries (so a missing Redis fails startup and
// tests with a clear error instead of hanging); once connected, it keeps reconnecting.
function getClient() {
    if (!client) {
        client = createClient({
            url: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
            socket: {
                connectTimeout: 5000,
                reconnectStrategy: (retries) =>
                    !everConnected && retries >= 3 ? new Error('Redis is unreachable') : Math.min(retries * 500, 5000),
            },
        });
        client.on('error', (err) => console.error('Redis error:', err.message));
        client.on('ready', () => { everConnected = true; });
    }
    return client;
}

export class Redis {

    static async connect() {
        const c = getClient();
        if (!c.isOpen) await c.connect();
    }

    static async ping() {
        const c = getClient();
        return c.isReady && (await c.ping()) === 'PONG';
    }

    static async disconnect() {
        if (client?.isOpen) await client.quit();
        client = undefined;
    }

    static async flush() {
        await getClient().flushDb();
    }

    static async setRedis(key: string, value: string, expiryInSeconds?: number) {
        const option = expiryInSeconds ? { EX: expiryInSeconds } : undefined;
        await getClient().set(key, value, option);
    }

    static async get(key: string) {
        return getClient().get(key);
    }

    static async del(key: string) {
        await getClient().del(key);
    }
}
