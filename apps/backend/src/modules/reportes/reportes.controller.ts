import { Response } from 'express';
import { ZodError } from 'zod';
import { ReportesService } from './reportes.service';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { sendSuccess, sendFail, sendError } from '../../utils/response';
import { assertTiendaSucursalParam, canFilterAllTiendasInReportes } from '../../utils/tienda-access';
import { tenantIdOrThrow } from '../../utils/tenant-access';
import { AppError } from '../../middlewares/error.middleware';
import {
  reportesRangoFechasSchema,
  reportesResumenDiaSchema,
  reportesPanelResumenSchema,
  reportesPeriodoDgiiSchema,
  reportesCompararPeriodosSchema,
  inventarioValorizadoQuerySchema,
  reportesStockAlertaSchema,
} from './dto/reportes.dto';

const service = new ReportesService();

/** Filtro de sucursal: admin puede omitir (todas) o pasar `tiendaId`; el resto queda fijado a su tienda. */
function tiendaIdParamForReportes(req: AuthRequest, queryTienda?: string | null): number | null {
  const u = req.user!;
  if (canFilterAllTiendasInReportes(u)) {
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

function zodFail(res: Response, e: ZodError) {
  const msg = e.issues.map((i) => i.message).join('; ') || 'Parámetros inválidos';
  return sendError(res, msg, 400);
}

export class ReportesController {
  async ventasPorDia(req: AuthRequest, res: Response) {
    try {
      const q = reportesRangoFechasSchema.parse(req.query);
      const tid = tiendaIdParamForReportes(req, q.tiendaId != null ? String(q.tiendaId) : undefined);
      return sendSuccess(res, await service.ventasPorDia(q.desde, q.hasta, tenantIdOrThrow(req.user), tid));
    } catch (e: unknown) {
      if (e instanceof ZodError) return zodFail(res, e);
      return sendFail(res, e);
    }
  }

  async cierreCaja(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.cierreCaja(Number(req.params.id), tenantIdOrThrow(req.user)));
    } catch (e: unknown) { return sendFail(res, e); }
  }

  async conciliacionCaja(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(
        res,
        await service.conciliacionCaja(Number(req.params.id), tenantIdOrThrow(req.user)),
      );
    } catch (e: unknown) { return sendFail(res, e); }
  }

  async conciliacionCajaLista(req: AuthRequest, res: Response) {
    try {
      const q = reportesRangoFechasSchema.parse(req.query);
      const tid = tiendaIdParamForReportes(req, q.tiendaId != null ? String(q.tiendaId) : undefined);
      return sendSuccess(
        res,
        await service.conciliacionCajaLista(
          q.desde, q.hasta, tenantIdOrThrow(req.user), tid, q.limit ?? 50,
        ),
      );
    } catch (e: unknown) {
      if (e instanceof ZodError) return zodFail(res, e);
      return sendFail(res, e);
    }
  }

  async resumenDia(req: AuthRequest, res: Response) {
    try {
      const q = reportesResumenDiaSchema.parse(req.query);
      const tid = tiendaIdParamForReportes(req, q.tiendaId != null ? String(q.tiendaId) : undefined);
      return sendSuccess(res, await service.resumenDia(q.fecha, tenantIdOrThrow(req.user), tid));
    } catch (e: unknown) {
      if (e instanceof ZodError) return zodFail(res, e);
      return sendFail(res, e);
    }
  }

  async panelResumen(req: AuthRequest, res: Response) {
    try {
      const q = reportesPanelResumenSchema.parse(req.query);
      const tid = tiendaIdParamForReportes(req, q.tiendaId != null ? String(q.tiendaId) : undefined);
      return sendSuccess(
        res,
        await service.panelResumen(
          q.fecha,
          tenantIdOrThrow(req.user),
          tid,
          q.dias,
          q.stockMinimo,
        ),
      );
    } catch (e: unknown) {
      if (e instanceof ZodError) return zodFail(res, e);
      return sendFail(res, e);
    }
  }

  async topProductos(req: AuthRequest, res: Response) {
    try {
      const q = reportesRangoFechasSchema.parse(req.query);
      const tid = tiendaIdParamForReportes(req, q.tiendaId != null ? String(q.tiendaId) : undefined);
      return sendSuccess(res, await service.topProductos(
        q.desde, q.hasta, q.limit ?? 10, tenantIdOrThrow(req.user), tid,
      ));
    } catch (e: unknown) {
      if (e instanceof ZodError) return zodFail(res, e);
      return sendFail(res, e);
    }
  }

  async ganancias(req: AuthRequest, res: Response) {
    try {
      const q = reportesRangoFechasSchema.parse(req.query);
      const tid = tiendaIdParamForReportes(req, q.tiendaId != null ? String(q.tiendaId) : undefined);
      return sendSuccess(res, await service.ganancias(q.desde, q.hasta, tenantIdOrThrow(req.user), tid));
    } catch (e: unknown) {
      if (e instanceof ZodError) return zodFail(res, e);
      return sendFail(res, e);
    }
  }

  async compararPeriodos(req: AuthRequest, res: Response) {
    try {
      const q = reportesCompararPeriodosSchema.parse(req.query);
      const tid = tiendaIdParamForReportes(req, q.tiendaId != null ? String(q.tiendaId) : undefined);
      return sendSuccess(
        res,
        await service.compararPeriodos(q.referencia, tenantIdOrThrow(req.user), tid),
      );
    } catch (e: unknown) {
      if (e instanceof ZodError) return zodFail(res, e);
      return sendFail(res, e);
    }
  }

  async inventarioValorizado(req: AuthRequest, res: Response) {
    try {
      const q = inventarioValorizadoQuerySchema.parse(req.query);
      return sendSuccess(res, await service.inventarioValorizado(tenantIdOrThrow(req.user), q));
    } catch (e: unknown) {
      if (e instanceof ZodError) return zodFail(res, e);
      return sendFail(res, e);
    }
  }

  async inventarioValorizadoExport(req: AuthRequest, res: Response) {
    try {
      const q = (req.query.q as string | undefined) ?? '';
      return sendSuccess(res, await service.inventarioValorizadoExport(tenantIdOrThrow(req.user), q));
    } catch (e: unknown) { return sendFail(res, e); }
  }

  async inventarioAlertas(req: AuthRequest, res: Response) {
    try {
      const q = reportesStockAlertaSchema.parse(req.query);
      return sendSuccess(res, await service.inventarioAlertas(tenantIdOrThrow(req.user), q));
    } catch (e: unknown) {
      if (e instanceof ZodError) return zodFail(res, e);
      return sendFail(res, e);
    }
  }

  async cartera(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.cartera(tenantIdOrThrow(req.user)));
    } catch (e: unknown) { return sendFail(res, e); }
  }

  async dgii607Preview(req: AuthRequest, res: Response) {
    try {
      const { periodo } = reportesPeriodoDgiiSchema.parse(req.query);
      return sendSuccess(res, await service.dgii607Preview(periodo, tenantIdOrThrow(req.user)));
    } catch (e: unknown) {
      if (e instanceof ZodError) return zodFail(res, e);
      return sendFail(res, e);
    }
  }

  async dgii606Preview(req: AuthRequest, res: Response) {
    try {
      const { periodo } = reportesPeriodoDgiiSchema.parse(req.query);
      return sendSuccess(res, await service.dgii606Preview(periodo, tenantIdOrThrow(req.user)));
    } catch (e: unknown) {
      if (e instanceof ZodError) return zodFail(res, e);
      return sendFail(res, e);
    }
  }

  async topClientes(req: AuthRequest, res: Response) {
    try {
      const q = reportesRangoFechasSchema.parse(req.query);
      const tid = tiendaIdParamForReportes(req, q.tiendaId != null ? String(q.tiendaId) : undefined);
      return sendSuccess(res, await service.topClientes(
        q.desde, q.hasta, q.limit ?? 10, tenantIdOrThrow(req.user), tid,
      ));
    } catch (e: unknown) {
      if (e instanceof ZodError) return zodFail(res, e);
      return sendFail(res, e);
    }
  }

  async resumenPorSucursal(req: AuthRequest, res: Response) {
    try {
      const q = reportesRangoFechasSchema.parse(req.query);
      const tiendaId = Number(req.params.tiendaId);
      assertTiendaSucursalParam(req.user!, tiendaId);
      return sendSuccess(res, await service.resumenPorSucursal(
        tiendaId, q.desde, q.hasta, tenantIdOrThrow(req.user),
      ));
    } catch (e: unknown) {
      if (e instanceof ZodError) return zodFail(res, e);
      return sendFail(res, e);
    }
  }

  async ventasPorUsuario(req: AuthRequest, res: Response) {
    try {
      const q = reportesRangoFechasSchema.parse(req.query);
      const tid = tiendaIdParamForReportes(req, q.tiendaId != null ? String(q.tiendaId) : undefined);
      return sendSuccess(res, await service.ventasPorUsuario(
        q.desde, q.hasta, tid, tenantIdOrThrow(req.user),
      ));
    } catch (e: unknown) {
      if (e instanceof ZodError) return zodFail(res, e);
      return sendFail(res, e);
    }
  }

  async ventasPorCaja(req: AuthRequest, res: Response) {
    try {
      const q = reportesRangoFechasSchema.parse(req.query);
      const tid = tiendaIdParamForReportes(req, q.tiendaId != null ? String(q.tiendaId) : undefined);
      return sendSuccess(res, await service.ventasPorCaja(
        q.desde, q.hasta, tid, tenantIdOrThrow(req.user),
      ));
    } catch (e: unknown) {
      if (e instanceof ZodError) return zodFail(res, e);
      return sendFail(res, e);
    }
  }

  async dgii607(req: AuthRequest, res: Response) {
    try {
      const { periodo } = reportesPeriodoDgiiSchema.parse(req.query);
      const txt = await service.dgii607(periodo, tenantIdOrThrow(req.user));
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="607-${periodo}.txt"`);
      return res.end(txt);
    } catch (e: unknown) {
      if (e instanceof ZodError) return zodFail(res, e);
      return sendFail(res, e);
    }
  }

  async operacionesComerciales(req: AuthRequest, res: Response) {
    try {
      const q = reportesRangoFechasSchema.parse(req.query);
      return sendSuccess(
        res,
        await service.operacionesComerciales(q.desde, q.hasta, tenantIdOrThrow(req.user)),
      );
    } catch (e: unknown) {
      if (e instanceof ZodError) return zodFail(res, e);
      return sendFail(res, e);
    }
  }

  async ventasResumenPdf(req: AuthRequest, res: Response) {
    try {
      const q = reportesRangoFechasSchema.parse(req.query);
      const tid = tiendaIdParamForReportes(req, q.tiendaId != null ? String(q.tiendaId) : undefined);
      const buf = await service.ventasResumenPdf(
        q.desde, q.hasta, tenantIdOrThrow(req.user), tid,
      );
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="ventas-resumen-${q.desde}_${q.hasta}.pdf"`,
      );
      return res.end(buf);
    } catch (e: unknown) {
      if (e instanceof ZodError) return zodFail(res, e);
      return sendFail(res, e);
    }
  }

  async dgii606(req: AuthRequest, res: Response) {
    try {
      const { periodo } = reportesPeriodoDgiiSchema.parse(req.query);
      const txt = await service.dgii606(periodo, tenantIdOrThrow(req.user));
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="606-${periodo}.txt"`);
      return res.end(txt);
    } catch (e: unknown) {
      if (e instanceof ZodError) return zodFail(res, e);
      return sendFail(res, e);
    }
  }
}
