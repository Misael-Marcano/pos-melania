import { Response } from 'express';
import { ReportesService } from './reportes.service';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { sendSuccess, sendError } from '../../utils/response';

const service = new ReportesService();

export class ReportesController {
  async ventasPorDia(req: AuthRequest, res: Response) {
    try {
      const { desde, hasta } = req.query as Record<string, string>;
      return sendSuccess(res, await service.ventasPorDia(desde, hasta));
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async cierreCaja(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.cierreCaja(Number(req.params.id)));
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async resumenDia(req: AuthRequest, res: Response) {
    try {
      const fecha = (req.query.fecha as string) ?? new Date().toISOString().split('T')[0];
      return sendSuccess(res, await service.resumenDia(fecha));
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async topProductos(req: AuthRequest, res: Response) {
    try {
      const { desde, hasta, limit } = req.query as Record<string, string>;
      return sendSuccess(res, await service.topProductos(desde, hasta, Number(limit) || 10));
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async ganancias(req: AuthRequest, res: Response) {
    try {
      const { desde, hasta } = req.query as Record<string, string>;
      return sendSuccess(res, await service.ganancias(desde, hasta));
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async inventarioValorizado(_req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.inventarioValorizado());
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async topClientes(req: AuthRequest, res: Response) {
    try {
      const { desde, hasta, limit } = req.query as Record<string, string>;
      return sendSuccess(res, await service.topClientes(desde, hasta, Number(limit) || 10));
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async dgii607(req: AuthRequest, res: Response) {
    try {
      const periodo = req.query.periodo as string;
      if (!periodo || !/^\d{6}$/.test(periodo))
        return res.status(400).json({ message: 'periodo debe ser YYYYMM' });
      const txt = await service.dgii607(periodo);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="607-${periodo}.txt"`);
      return res.end(txt);
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async dgii606(req: AuthRequest, res: Response) {
    try {
      const periodo = req.query.periodo as string;
      if (!periodo || !/^\d{6}$/.test(periodo))
        return res.status(400).json({ message: 'periodo debe ser YYYYMM' });
      const txt = await service.dgii606(periodo);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="606-${periodo}.txt"`);
      return res.end(txt);
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }
}
