import { Response } from 'express';
import { InventarioService } from './inventario.service';
import { createArticuloSchema, updateArticuloSchema, createCategoriaSchema, ajustarInventarioSchema } from './dto/inventario.dto';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { sendSuccess, sendError, sendPaginated } from '../../utils/response';
import { registrarAudit } from '../../utils/audit';

const service = new InventarioService();

export class InventarioController {
  async findAll(req: AuthRequest, res: Response) {
    try {
      const { data, total, page, limit } = await service.findAll(req);
      return sendPaginated(res, data, total, page, limit);
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async findById(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.findById(Number(req.params.id), req.user!));
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error', 404); }
  }

  async findByBarcode(req: AuthRequest, res: Response) {
    try {
      return sendSuccess(res, await service.findByBarcode(req.params.codigo, req.user!));
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error', 404); }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const dto   = createArticuloSchema.parse(req.body);
      const saved = await service.create(dto, req.user!);
      registrarAudit({ tabla: 'articulos', operacion: 'CREATE', registroId: saved.id, descripcion: `Creó artículo "${saved.nombre}"`, valorNuevo: saved, usuarioId: req.user?.id, usuarioNombre: req.user?.nombre, ip: req.ip });
      return sendSuccess(res, saved, 'Artículo creado', 201);
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const id     = Number(req.params.id);
      const prev   = await service.findById(id, req.user!).catch(() => null);
      const dto    = updateArticuloSchema.parse(req.body);
      const saved  = await service.update(id, dto, req.user!);
      registrarAudit({ tabla: 'articulos', operacion: 'UPDATE', registroId: id, descripcion: `Actualizó artículo "${saved.nombre}"`, valorAnterior: prev ?? undefined, valorNuevo: saved, usuarioId: req.user?.id, usuarioNombre: req.user?.nombre, ip: req.ip });
      return sendSuccess(res, saved, 'Artículo actualizado');
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async clone(req: AuthRequest, res: Response) {
    try {
      const saved = await service.clone(Number(req.params.id), req.user!);
      registrarAudit({ tabla: 'articulos', operacion: 'CREATE', registroId: saved.id, descripcion: `Clonó artículo "${saved.nombre}"`, valorNuevo: saved, usuarioId: req.user?.id, usuarioNombre: req.user?.nombre, ip: req.ip });
      return sendSuccess(res, saved, 'Artículo clonado', 201);
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const id   = Number(req.params.id);
      const prev = await service.findById(id, req.user!).catch(() => null);
      await service.delete(id, req.user!);
      registrarAudit({ tabla: 'articulos', operacion: 'DELETE', registroId: id, descripcion: `Eliminó artículo "${prev?.nombre ?? id}"`, valorAnterior: prev ?? undefined, usuarioId: req.user?.id, usuarioNombre: req.user?.nombre, ip: req.ip });
      return sendSuccess(res, null, 'Artículo eliminado');
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async ajustarInventario(req: AuthRequest, res: Response) {
    try {
      const id       = Number(req.params.id);
      const { cantidad } = ajustarInventarioSchema.parse(req.body);
      const saved    = await service.ajustarInventario(id, cantidad, req.user!);
      registrarAudit({ tabla: 'articulos', operacion: 'UPDATE', registroId: id, descripcion: `Ajustó stock de "${saved.nombre}" en ${cantidad > 0 ? '+' : ''}${cantidad} (nuevo: ${saved.cantidad})`, usuarioId: req.user?.id, usuarioNombre: req.user?.nombre, ip: req.ip });
      return sendSuccess(res, saved, 'Inventario ajustado');
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async importarCSV(req: AuthRequest, res: Response) {
    try {
      const { csv } = req.body as { csv: string };
      if (!csv || typeof csv !== 'string') return sendError(res, 'Se requiere el campo "csv"', 400);
      const result = await service.importarCSV(csv, req.user!);
      return sendSuccess(res, result, `Importación completada: ${result.creados} creados, ${result.actualizados} actualizados`);
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async getMovimientos(req: AuthRequest, res: Response) {
    try {
      const articuloId = Number(req.params.id);
      const { data, total, page, limit } = await service.getMovimientos(articuloId, req, req.user!);
      return sendPaginated(res, data, total, page, limit);
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async getStockBajo(req: AuthRequest, res: Response) {
    try {
      const minimo = Number(req.query.minimo) || 10;
      return sendSuccess(res, await service.getStockBajo(minimo, req.user!));
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async getCategorias(req: AuthRequest, res: Response) {
    try { return sendSuccess(res, await service.getCategorias(req.user!)); }
    catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async createCategoria(req: AuthRequest, res: Response) {
    try {
      const dto = createCategoriaSchema.parse(req.body);
      return sendSuccess(res, await service.createCategoria(dto, req.user!), 'Categoría creada', 201);
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }

  async deleteCategoria(req: AuthRequest, res: Response) {
    try {
      await service.deleteCategoria(Number(req.params.id), req.user!);
      return sendSuccess(res, null, 'Categoría eliminada');
    } catch (e: unknown) { return sendError(res, e instanceof Error ? e.message : 'Error'); }
  }
}
