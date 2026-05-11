import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    /** UUID por petición (middleware `requestIdMiddleware`) */
    requestId?: string;
  }
}
