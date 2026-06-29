import { Environment } from "./environment";
export const environment_prod: Environment = {
    token_secret: process.env.prod_token_secret!,
    token_refresh_secret: process.env.prod_token_refresh_secret!,
    db_uri: process.env.prod_db_uri!,
    auth_gmail: {
        username: process.env.prod_username!,
        password: process.env.prod_password!
    }


    ,

    local_redis:
    {
        url: process.env.prod_local_redis_url!,
        username: process.env.prod_local_redis_username!,
        password: process.env.prod_local_redis_password!,
        port: parseInt(process.env.prod_local_redis_port!),
        host: process.env.prod_local_redis_host!
    }
};