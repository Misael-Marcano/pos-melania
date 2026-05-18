import { Response } from 'express';
import { VentasService } from './ventas.service';
import { createVentaSchema, updateVentaSchema, fullUpdateVentaSchema, aperturaCajaSchema, cierreCajaSchema, historialCajasQuerySchema } from './dto/ventas.dto';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { sendSuccess, sendError, sendFail, sendPaginated } from '../../utils/response';
import { registrarAudit } from '../../utils/audit';

const service = new VentasService();

export class VentasController {
  async findAll(req: AuthRequest, res: Response) {
    try {
      const { data, total, page, limit } = await service.findAll(req);
      return sendPaginated(res, data, total, page, limit);
    } catch (e: unknown) { return sendFail(res, e); }
  }

  async findById(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.findById(Number(req.params.id), req.user!));
    } catch (e: unknown) { return sendFail(res, e, { defaultStatus: 404 }); }
  }

  /**
   * Trazabilidad fiscal: impresión o reimpresión de recibo (NCF en descripción si aplica).
   * Admin/soporte: cualquier venta. Cajero: solo ventas registradas por él.
   */
  async auditarReciboImpresion(req: AuthRequest, res: Response) {
    try {
      const id    = Number(req.params.id);
      const u     = req.user!;
      const venta = await service.findById(id, u);
      if (u.rol === 'cajero') {
        const ownerId = venta.usuario?.id;
        if (ownerId == null || ownerId !== u.id) {
          return sendError(res, 'No autorizado a auditar esta venta', 403);
        }
      }
      const ncf = venta.comprobante ? ` · NCF ${venta.comprobante}` : '';
      registrarAudit({
        tabla:         'ventas',
        operacion:     'READ',
        registroId:    id,
        descripcion:   `Impresión o vista de recibo (venta #${id}${ncf})`,
        valorNuevo:    { comprobante: venta.comprobante ?? null, total: Number(venta.total) },
        usuarioId:     u.id,
        usuarioNombre: u.nombre,
        ip:            req.ip,
      });
      return sendSuccess(res, { ok: true });
    } catch (e: unknown) { return sendFail(res, e, { defaultStatus: 404 }); }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const dto  = createVentaSchema.parse(req.body);
      const data = await service.create(dto, req.user!);
      registrarAudit({ tabla: 'ventas', operacion: 'CREATE', registroId: data.id, descripcion: `Registró venta #${data.id} por RD$${data.total}`, usuarioId: req.user?.id, usuarioNombre: req.user?.nombre, ip: req.ip });
      return sendSuccess(res, data, 'Venta registrada exitosamente', 201);
    } catch (e: unknown) { return sendFail(res, e, { defaultMessage: 'Error al registrar venta' }); }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const id   = Number(req.params.id);
      const dto  = updateVentaSchema.parse(req.body);
      const data = await service.update(id, dto, req.user!);
      registrarAudit({ tabla: 'ventas', operacion: 'UPDATE', registroId: id, descripcion: `Editó venta #${id}`, usuarioId: req.user?.id, usuarioNombre: req.user?.nombre, ip: req.ip });
      return sendSuccess(res, data, 'Venta actualizada');
    } catch (e: unknown) { return sendFail(res, e); }
  }

  async fullUpdate(req: AuthRequest, res: Response) {
    try {
      const id   = Number(req.params.id);
      const dto  = fullUpdateVentaSchema.parse(req.body);
      const data = await service.fullUpdate(id, dto, req.user!);
      registrarAudit({ tabla: 'ventas', operacion: 'UPDATE', registroId: id, descripcion: `Editó ítems de venta #${id}`, usuarioId: req.user?.id, usuarioNombre: req.user?.nombre, ip: req.ip });
      return sendSuccess(res, data, 'Venta actualizada');
    } catch (e: unknown) { return sendFail(res, e); }
  }

  async anular(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      await service.anular(id, req.user!, req.user?.id);
      registrarAudit({ tabla: 'ventas', operacion: 'UPDATE', registroId: id, descripcion: `Anuló venta #${id}`, usuarioId: req.user?.id, usuarioNombre: req.user?.nombre, ip: req.ip });
      return sendSuccess(res, null, 'Venta anulada');
    } catch (e: unknown) { return sendFail(res, e); }
  }

  async resumenHoy(req: AuthRequest, res: Response) {
    try { return sendSuccess(res, await service.resumenHoy(req.user!)); }
    catch (e: unknown) { return sendFail(res, e); }
  }

  // ── Caja ──────────────────────────────────────────────────────────────────
  async abrirCaja(req: AuthRequest, res: Response) {
    try {
      const dto  = aperturaCajaSchema.parse(req.body);
      const data = await service.abrirCaja(dto, req.user!);
      registrarAudit({
        tabla:         'caja_aperturas',
        operacion:     'CREATE',
        registroId:    data.id,
        descripcion:   `Abrió caja "${data.cajaNombre}" · monto apertura RD$${data.montoApertura}`,
        valorNuevo:    {
          cajaNombre:    data.cajaNombre,
          montoApertura: Number(data.montoApertura),
          cajaId:        dto.cajaId ?? null,
          tiendaId:      dto.tiendaId ?? null,
        },
        usuarioId:     req.user?.id,
        usuarioNombre: req.user?.nombre,
        ip:            req.ip,
      });
      return sendSuccess(res, data, 'Caja abierta', 201);
    } catch (e: unknown) { return sendFail(res, e); }
  }

  async cerrarCaja(req: AuthRequest, res: Response) {
    try {
      const dto  = cierreCajaSchema.parse(req.body);
      const data = await service.cerrarCaja(dto, req.user!);
      registrarAudit({
        tabla:         'caja_aperturas',
        operacion:     'UPDATE',
        registroId:    data.id,
        descripcion:   `Cerró sesión de caja "${data.cajaNombre}" (sesión #${data.id}) · contado RD$${dto.montoCierre}`,
        valorNuevo:    {
          aperturaId:  dto.aperturaId,
          montoCierre: dto.montoCierre,
          notas:       dto.notas ?? null,
          fechaCierre: data.fechaCierre,
        },
        usuarioId:     req.user?.id,
        usuarioNombre: req.user?.nombre,
        ip:            req.ip,
      });
      return sendSuccess(res, data, 'Caja cerrada');
    } catch (e: unknown) { return sendFail(res, e); }
  }

  async getCajaActiva(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.getCajaActiva(req.params.nombre, req.user!));
    } catch (e: unknown) { return sendFail(res, e); }
  }

  async getCajaActivaPorCajaId(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.getCajaActivaPorCajaId(Number(req.params.cajaId), req.user!));
    } catch (e: unknown) { return sendFail(res, e); }
  }

  async resumenCaja(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.resumenCaja(Number(req.params.id), req.user!));
    } catch (e: unknown) { return sendFail(res, e); }
  }

  async getHistorialCajas(req: AuthRequest, res: Response) {
    try {
      const query = historialCajasQuerySchema.parse(req.query);
      const { data, total, page, limit } = await service.getHistorialCajas(query, req.user);
      return sendPaginated(res, data, total, page, limit);
    } catch (e: unknown) { return sendFail(res, e); }
  }

  async listCajasAbiertas(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.listCajasAbiertas(req.user!));
    } catch (e: unknown) { return sendFail(res, e); }
  }

  async pdfCierre(req: AuthRequest, res: Response) {
    try {
      const id  = Number(req.params.id);
      const buf = await service.generarPDFCierre(id, req.user!);
      registrarAudit({
        tabla:         'caja_aperturas',
        operacion:     'EXPORT',
        registroId:    id,
        descripcion:   `Generó / descargó PDF de cierre de caja (sesión #${id})`,
        valorNuevo:    { tipo: 'application/pdf', bytes: buf.length },
        usuarioId:     req.user?.id,
        usuarioNombre: req.user?.nombre,
        ip:            req.ip,
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="cierre-caja-${id}.pdf"`);
      res.end(buf);
    } catch (e: unknown) { return sendFail(res, e); }
  }
}
