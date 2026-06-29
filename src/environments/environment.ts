import { environment_dev } from './environment_dev';
import { environment_prod } from './environment_prod';
export interface Environment {

    db_uri: string
    token_secret: string
    token_refresh_secret: string
    auth_gmail?:
    {
        username: string
        password: string
    }

    local_redis?:
    {
        url: string
        username: string
        password: string
        port: number
        host: string
    }
}


export function getEnvironment() {

    if (process.env.NODE_ENV === 'production') {
        return environment_prod
    } else {
        return environment_dev
    }
}