import { Response } from 'express';
import { ReportesService } from './reportes.service';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { sendSuccess, sendFail } from '../../utils/response';
import { assertTiendaSucursalParam, isAdmin } from '../../utils/tienda-access';
import { tenantIdOrThrow } from '../../utils/tenant-access';
import { AppError } from '../../middlewares/error.middleware';

const service = new ReportesService();

/** Filtro de sucursal: admin puede omitir (todas) o pasar `tiendaId`; el resto queda fijado a su tienda. */
function tiendaIdParamForReportes(req: AuthRequest, queryTienda?: string): number | null {
  const u = req.user!;
  if (isAdmin(u)) {
    if (queryTienda != null && queryTienda !== '') {
      const id = Number(queryTienda);
      if (!Number.isFinite(id) || id <= 0) throw new AppError('tiendaId inválido', 400);
      return id;
    }
    return null;
  }
  if (u.tiendaId == null) throw new AppError('Tu usuario debe tener sucursal asignada.', 403);
  if (queryTienda != null && queryTienda !== '') assertTiendaSucursalParam(u, Number(queryTienda));
  return u.tiendaId;
}

export class ReportesController {
  async ventasPorDia(req: AuthRequest, res: Response) {
    try {
      const { desde, hasta } = req.query as Record<string, string>;
      return sendSuccess(res, await service.ventasPorDia(desde, hasta, tenantIdOrThrow(req.user)));
    } catch (e: unknown) { return sendFail(res, e); }
  }

  async cierreCaja(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.cierreCaja(Number(req.params.id), tenantIdOrThrow(req.user)));
    } catch (e: unknown) { return sendFail(res, e); }
  }

  async resumenDia(req: AuthRequest, res: Response) {
    try {
      const fecha = (req.query.fecha as string) ?? new Date().toISOString().split('T')[0];
      return sendSuccess(res, await service.resumenDia(fecha, tenantIdOrThrow(req.user)));
    } catch (e: unknown) { return sendFail(res, e); }
  }

  async topProductos(req: AuthRequest, res: Response) {
    try {
      const { desde, hasta, limit } = req.query as Record<string, string>;
      return sendSuccess(res, await service.topProductos(desde, hasta, Number(limit) || 10, tenantIdOrThrow(req.user)));
    } catch (e: unknown) { return sendFail(res, e); }
  }

  async ganancias(req: AuthRequest, res: Response) {
    try {
      const { desde, hasta } = req.query as Record<string, string>;
      return sendSuccess(res, await service.ganancias(desde, hasta, tenantIdOrThrow(req.user)));
    } catch (e: unknown) { return sendFail(res, e); }
  }

  async inventarioValorizado(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.inventarioValorizado(tenantIdOrThrow(req.user)));
    } catch (e: unknown) { return sendFail(res, e); }
  }

  async topClientes(req: AuthRequest, res: Response) {
    try {
      const { desde, hasta, limit } = req.query as Record<string, string>;
      return sendSuccess(res, await service.topClientes(desde, hasta, Number(limit) || 10, tenantIdOrThrow(req.user)));
    } catch (e: unknown) { return sendFail(res, e); }
  }

  async resumenPorSucursal(req: AuthRequest, res: Response) {
    try {
      const { desde, hasta } = req.query as Record<string, string>;
      if (!desde || !hasta)
        return res.status(400).json({ success: false, message: 'desde y hasta son requeridos' });
      const tiendaId = Number(req.params.tiendaId);
      assertTiendaSucursalParam(req.user!, tiendaId);
      return sendSuccess(res, await service.resumenPorSucursal(tiendaId, desde, hasta, tenantIdOrThrow(req.user)));
    } catch (e: unknown) { return sendFail(res, e); }
  }

  async ventasPorUsuario(req: AuthRequest, res: Response) {
    try {
      const { desde, hasta, tiendaId: q } = req.query as Record<string, string>;
      if (!desde || !hasta)
        return res.status(400).json({ success: false, message: 'desde y hasta son requeridos' });
      const tid = tiendaIdParamForReportes(req, q);
      return sendSuccess(res, await service.ventasPorUsuario(desde, hasta, tid, tenantIdOrThrow(req.user)));
    } catch (e: unknown) { return sendFail(res, e); }
  }

  async ventasPorCaja(req: AuthRequest, res: Response) {
    try {
      const { desde, hasta, tiendaId: q } = req.query as Record<string, string>;
      if (!desde || !hasta)
        return res.status(400).json({ success: false, message: 'desde y hasta son requeridos' });
      const tid = tiendaIdParamForReportes(req, q);
      return sendSuccess(res, await service.ventasPorCaja(desde, hasta, tid, tenantIdOrThrow(req.user)));
    } catch (e: unknown) { return sendFail(res, e); }
  }

  async dgii607(req: AuthRequest, res: Response) {
    try {
      const periodo = req.query.periodo as string;
      if (!periodo || !/^\d{6}$/.test(periodo))
        return res.status(400).json({ message: 'periodo debe ser YYYYMM' });
      const txt = await service.dgii607(periodo, tenantIdOrThrow(req.user));
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="607-${periodo}.txt"`);
      return res.end(txt);
    } catch (e: unknown) { return sendFail(res, e); }
  }

  async dgii606(req: AuthRequest, res: Response) {
    try {
      const periodo = req.query.periodo as string;
      if (!periodo || !/^\d{6}$/.test(periodo))
        return res.status(400).json({ message: 'periodo debe ser YYYYMM' });
      const txt = await service.dgii606(periodo, tenantIdOrThrow(req.user));
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="606-${periodo}.txt"`);
      return res.end(txt);
    } catch (e: unknown) { return sendFail(res, e); }
  }
}
