import { Environment } from "./environment";

export const environment_dev: Environment = {
    token_secret: process.env.dev_token_secret!,
    token_refresh_secret: process.env.dev_token_refresh_secret!,
    db_uri: process.env.dev_db_uri!,
    auth_gmail: {
        username: process.env.dev_username!,
        password: process.env.dev_password!
    },

        local_redis:
    {
        url: process.env.dev_local_redis_url!,
        username: process.env.dev_local_redis_username!,
        password: process.env.dev_local_redis_password!,
        port: parseInt(process.env.dev_local_redis_port!),
        host: process.env.dev_local_redis_host!
    }
};