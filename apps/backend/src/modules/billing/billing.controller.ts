import { Response } from 'express';
import { ZodError } from 'zod';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { AppError } from '../../middlewares/error.middleware';
import { sendSuccess, sendError } from '../../utils/response';
import { BillingService } from './billing.service';
import { createCheckoutSessionSchema, createPortalSessionSchema } from './dto/billing.dto';

const service = new BillingService();

export class BillingController {
  async status(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return sendError(res, 'No autenticado', 401);
      const data = await service.getPublicStatus(req.user);
      return sendSuccess(res, data, 'Estado de facturación');
    } catch (e: unknown) {
      if (e instanceof AppError) return sendError(res, e.message, e.statusCode);
      return sendError(res, e instanceof Error ? e.message : 'Error');
    }
  }

  async createCheckoutSession(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return sendError(res, 'No autenticado', 401);
      const dto = createCheckoutSessionSchema.parse(req.body);
      const data = await service.createCheckoutSession(req.user, dto);
      return sendSuccess(res, data, 'Sesión de checkout');
    } catch (e: unknown) {
      if (e instanceof ZodError) return sendError(res, 'Datos inválidos', 422);
      if (e instanceof AppError) return sendError(res, e.message, e.statusCode);
      return sendError(res, e instanceof Error ? e.message : 'Error');
    }
  }

  async createPortalSession(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return sendError(res, 'No autenticado', 401);
      const dto = createPortalSessionSchema.parse(req.body);
      const data = await service.createPortalSession(req.user, dto.returnUrl);
      return sendSuccess(res, data, 'Portal de facturación');
    } catch (e: unknown) {
      if (e instanceof ZodError) return sendError(res, 'Datos inválidos', 422);
      if (e instanceof AppError) return sendError(res, e.message, e.statusCode);
      return sendError(res, e instanceof Error ? e.message : 'Error');
    }
  }
}
