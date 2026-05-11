import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

/**
 * Asigna un ID único por petición (o respeta `X-Request-Id` del cliente/proxy)
 * y lo expone en la respuesta para correlacionar con logs.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.get('x-request-id')?.trim();
  const id = incoming && incoming.length > 0 ? incoming : randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}
