import { Response } from 'express';
import { VentasService } from './ventas.service';
import { createVentaSchema, updateVentaSchema, fullUpdateVentaSchema, aperturaCajaSchema, cierreCajaSchema } from './dto/ventas.dto';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { sendSuccess, sendError, sendPaginated } from '../../utils/response';
import { registrarAudit } from '../../utils/audit';

const service = new VentasService();

export class VentasController {
  async findAll(req: AuthRequest, res: Response) {
    try {
      const { data, total, page, limit } = await service.findAll(req);
      return sendPaginated(res, data, total, page, limit);
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async findById(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.findById(Number(req.params.id)));
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error', 404); }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const dto  = createVentaSchema.parse(req.body);
      const data = await service.create(dto, req.user!);
      registrarAudit({ tabla: 'ventas', operacion: 'CREATE', registroId: data.id, descripcion: `Registró venta #${data.id} por RD$${data.total}`, usuarioId: req.user?.id, usuarioNombre: req.user?.nombre, ip: req.ip });
      return sendSuccess(res, data, 'Venta registrada exitosamente', 201);
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error al registrar venta'); }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const id   = Number(req.params.id);
      const dto  = updateVentaSchema.parse(req.body);
      const data = await service.update(id, dto);
      registrarAudit({ tabla: 'ventas', operacion: 'UPDATE', registroId: id, descripcion: `Editó venta #${id}`, usuarioId: req.user?.id, usuarioNombre: req.user?.nombre, ip: req.ip });
      return sendSuccess(res, data, 'Venta actualizada');
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async fullUpdate(req: AuthRequest, res: Response) {
    try {
      const id   = Number(req.params.id);
      const dto  = fullUpdateVentaSchema.parse(req.body);
      const data = await service.fullUpdate(id, dto);
      registrarAudit({ tabla: 'ventas', operacion: 'UPDATE', registroId: id, descripcion: `Editó ítems de venta #${id}`, usuarioId: req.user?.id, usuarioNombre: req.user?.nombre, ip: req.ip });
      return sendSuccess(res, data, 'Venta actualizada');
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async anular(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      await service.anular(id, req.user?.id);
      registrarAudit({ tabla: 'ventas', operacion: 'UPDATE', registroId: id, descripcion: `Anuló venta #${id}`, usuarioId: req.user?.id, usuarioNombre: req.user?.nombre, ip: req.ip });
      return sendSuccess(res, null, 'Venta anulada');
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async resumenHoy(_req: AuthRequest, res: Response) {
    try { return sendSuccess(res, await service.resumenHoy()); }
    catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  // ── Caja ──────────────────────────────────────────────────────────────────
  async abrirCaja(req: AuthRequest, res: Response) {
    try {
      const dto  = aperturaCajaSchema.parse(req.body);
      return sendSuccess(res, await service.abrirCaja(dto, req.user!), 'Caja abierta', 201);
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async cerrarCaja(req: AuthRequest, res: Response) {
    try {
      const dto  = cierreCajaSchema.parse(req.body);
      return sendSuccess(res, await service.cerrarCaja(dto), 'Caja cerrada');
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async getCajaActiva(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.getCajaActiva(req.params.nombre));
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async resumenCaja(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.resumenCaja(Number(req.params.id)));
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async getHistorialCajas(req: AuthRequest, res: Response) {
    try {
      const page  = Number(req.query.page)  || 1;
      const limit = Number(req.query.limit) || 20;
      const { data, total } = await service.getHistorialCajas(page, limit);
      return sendPaginated(res, data, total, page, limit);
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async pdfCierre(req: AuthRequest, res: Response) {
    try {
      const id  = Number(req.params.id);
      const buf = await service.generarPDFCierre(id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="cierre-caja-${id}.pdf"`);
      res.end(buf);
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }
}
