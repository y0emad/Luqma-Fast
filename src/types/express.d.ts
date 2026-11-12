declare global {
    namespace Express {
        type UserType = "user" | "admin" | "restaurant";

        interface AuthUser {
            aud: string;
            email: string;
            name: string;
            type: UserType;
        }

        interface Request {
            user?: AuthUser;
            rest?: any;
            restaurant?: any;
            oldUser?: any;
        }
    }
}

export {};
