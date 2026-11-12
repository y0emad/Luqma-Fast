// Adds the logged-in user (the JWT payload) and the documents the validators
// load to Express's Request type, so controllers don't need `any`.
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
