import { ILike, FindOptionsWhere, EntityManager } from 'typeorm';
import { Request } from 'express';
import { AppDataSource } from '../../config/database';
import { Articulo } from '../../entities/Articulo.entity';
import { Categoria } from '../../entities/Categoria.entity';
import { MovimientoInventario, TipoMovimiento } from '../../entities/MovimientoInventario.entity';
import { cache } from '../../config/redis';
import { AppError } from '../../middlewares/error.middleware';
import { getPagination } from '../../utils/pagination';
import { CreateArticuloDto, UpdateArticuloDto, CreateCategoriaDto } from './dto/inventario.dto';

const movRepo = (manager?: EntityManager) =>
  manager
    ? manager.getRepository(MovimientoInventario)
    : AppDataSource.getRepository(MovimientoInventario);

/** Registra un movimiento de stock. Usar dentro de transacciones pasando `manager`. */
export const registrarMovimiento = async (opts: {
  articuloId:     number;
  tipo:           TipoMovimiento;
  cantidad:       number;   // positivo = entrada, negativo = salida
  stockAntes:     number;
  stockDespues:   number;
  referenciaId?:  number;
  referenciaTipo?: string;
  notas?:         string;
  usuarioId?:     number;
  manager?:       EntityManager;
}): Promise<void> => {
  const { manager, ...fields } = opts;
  const repo = movRepo(manager);
  await repo.save(repo.create({
    articulo:      { id: fields.articuloId } as any,
    tipo:          fields.tipo,
    cantidad:      fields.cantidad,
    stockAntes:    fields.stockAntes,
    stockDespues:  fields.stockDespues,
    referenciaId:  fields.referenciaId,
    referenciaTipo: fields.referenciaTipo,
    notas:         fields.notas,
    usuario:       fields.usuarioId ? { id: fields.usuarioId } as any : undefined,
  }));
};

const artRepo = () => AppDataSource.getRepository(Articulo);
const catRepo = () => AppDataSource.getRepository(Categoria);
const ART_KEY = (id: number) => `articulo:${id}`;

const invalidate = async (id?: number) => {
  await cache.delPattern('inventario:list*');
  if (id) await cache.del(ART_KEY(id));
};

export class InventarioService {

  async findAll(req: Request) {
    const { page, limit, skip } = getPagination(req);
    const { q, categoriaId, campo = 'todo' } = req.query as Record<string, string>;

    const cacheKey = `inventario:list:${page}:${limit}:${q ?? ''}:${categoriaId ?? ''}:${campo}`;
    const cached   = await cache.get<{ data: Articulo[]; total: number }>(cacheKey);
    if (cached) return { ...cached, page, limit };

    let where: FindOptionsWhere<Articulo> | FindOptionsWhere<Articulo>[];

    if (q && campo === 'nombre') {
      where = { nombre: ILike(`%${q}%`), activo: true, ...(categoriaId ? { categoria: { id: +categoriaId } } : {}) };
    } else if (q && campo === 'codigoBarras') {
      where = { codigoBarras: ILike(`%${q}%`), activo: true };
    } else if (q) {
      where = [
        { nombre:       ILike(`%${q}%`), activo: true, ...(categoriaId ? { categoria: { id: +categoriaId } } : {}) },
        { codigoBarras: ILike(`%${q}%`), activo: true },
      ];
    } else {
      where = { activo: true, ...(categoriaId ? { categoria: { id: +categoriaId } } : {}) };
    }

    const [data, total] = await artRepo().findAndCount({
      where,
      relations: ['categoria'],
      order: { nombre: 'ASC' },
      skip,
      take: limit,
    });

    await cache.set(cacheKey, { data, total }, 60);
    return { data, total, page, limit };
  }

  async findById(id: number): Promise<Articulo> {
    const cached = await cache.get<Articulo>(ART_KEY(id));
    if (cached) return cached;
    const art = await artRepo().findOne({ where: { id, activo: true }, relations: ['categoria'] });
    if (!art) throw new AppError('Artículo no encontrado', 404);
    await cache.set(ART_KEY(id), art, 120);
    return art;
  }

  async findByBarcode(codigo: string): Promise<Articulo> {
    const art = await artRepo().findOne({ where: { codigoBarras: codigo, activo: true }, relations: ['categoria'] });
    if (!art) throw new AppError(`No se encontró artículo con código "${codigo}"`, 404);
    return art;
  }

  async create(dto: CreateArticuloDto): Promise<Articulo> {
    const categoria = await catRepo().findOne({ where: { id: dto.categoriaId } });
    if (!categoria) throw new AppError('Categoría no encontrada', 404);
    const existe = await artRepo().findOne({ where: { codigoBarras: dto.codigoBarras } });
    if (existe) throw new AppError(`Ya existe un artículo con el código "${dto.codigoBarras}"`, 409);
    const { categoriaId, ...rest } = dto;
    const saved = await artRepo().save(artRepo().create({ ...rest, categoria }));
    await invalidate();
    return saved;
  }

  async update(id: number, dto: UpdateArticuloDto): Promise<Articulo> {
    const art = await artRepo().findOne({ where: { id }, relations: ['categoria'] });
    if (!art) throw new AppError('Artículo no encontrado', 404);
    if (dto.categoriaId) {
      const cat = await catRepo().findOne({ where: { id: dto.categoriaId } });
      if (!cat) throw new AppError('Categoría no encontrada', 404);
      art.categoria = cat;
    }
    if (dto.codigoBarras && dto.codigoBarras !== art.codigoBarras) {
      const dup = await artRepo().findOne({ where: { codigoBarras: dto.codigoBarras } });
      if (dup && dup.id !== id) throw new AppError('Código de barras ya está en uso', 409);
    }
    const { categoriaId, ...rest } = dto;
    Object.assign(art, rest);
    const saved = await artRepo().save(art);
    await invalidate(id);
    return saved;
  }

  async clone(id: number): Promise<Articulo> {
    const art = await this.findById(id);
    const base = art.nombre.replace(/ \(copia.*\)$/, '');
    const copias = await artRepo().count({ where: { nombre: ILike(`${base} (copia%`) } });
    const suffix = copias > 0 ? ` (copia ${copias + 1})` : ' (copia)';
    const clone = artRepo().create({ ...art, id: undefined as any, nombre: `${base}${suffix}`, codigoBarras: `${art.codigoBarras}-${Date.now().toString().slice(-4)}`, cantidad: 0 });
    const saved = await artRepo().save(clone);
    await invalidate();
    return saved;
  }

  async delete(id: number): Promise<void> {
    const art = await artRepo().findOne({ where: { id } });
    if (!art) throw new AppError('Artículo no encontrado', 404);
    art.activo = false;
    await artRepo().save(art);
    await invalidate(id);
  }

  async ajustarInventario(id: number, cantidad: number, usuarioId?: number): Promise<Articulo> {
    const art = await artRepo().findOne({ where: { id } });
    if (!art) throw new AppError('Artículo no encontrado', 404);
    const stockAntes = art.cantidad ?? 0;
    const nueva = stockAntes + cantidad;
    if (nueva < 0) throw new AppError('Stock insuficiente para el ajuste', 400);
    art.cantidad = nueva;
    const saved = await artRepo().save(art);
    await registrarMovimiento({
      articuloId:   id,
      tipo:         cantidad >= 0 ? 'ENTRADA_MANUAL' : 'SALIDA_MANUAL',
      cantidad,
      stockAntes,
      stockDespues: nueva,
      usuarioId,
    });
    await invalidate(id);
    return saved;
  }

  async getMovimientos(articuloId: number, req: Request) {
    const { page, limit, skip } = getPagination(req);
    const [data, total] = await movRepo().findAndCount({
      where: { articulo: { id: articuloId } },
      relations: ['usuario'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async getStockBajo(minimo = 10): Promise<Articulo[]> {
    return artRepo()
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.categoria', 'c')
      .where('a.activo = 1')
      .andWhere('a.cantidad IS NOT NULL')
      .andWhere('a.cantidad <= :minimo', { minimo })
      .orderBy('a.cantidad', 'ASC')
      .getMany();
  }

  async importarCSV(csv: string, usuarioId?: number): Promise<{ creados: number; actualizados: number; errores: string[] }> {
    const lines  = csv.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) throw new AppError('El CSV debe tener al menos una fila de datos además del encabezado', 400);

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const required = ['codigobarras', 'nombre', 'precioventa', 'categoriaid'];
    const missing = required.filter((r) => !headers.includes(r));
    if (missing.length) throw new AppError(`Columnas requeridas faltantes: ${missing.join(', ')}`, 400);

    let creados = 0, actualizados = 0;
    const errores: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = vals[idx] ?? ''; });

      if (!row['codigobarras'] || !row['nombre'] || !row['precioventa'] || !row['categoriaid']) {
        errores.push(`Fila ${i + 1}: datos incompletos`);
        continue;
      }

      const catId = parseInt(row['categoriaid'], 10);
      if (isNaN(catId)) { errores.push(`Fila ${i + 1}: categoriaId inválido`); continue; }

      const precioVenta = parseFloat(row['precioventa']);
      if (isNaN(precioVenta)) { errores.push(`Fila ${i + 1}: precioVenta inválido`); continue; }

      const categoria = await catRepo().findOne({ where: { id: catId } });
      if (!categoria) { errores.push(`Fila ${i + 1}: categoría ID ${catId} no existe`); continue; }

      const existing = await artRepo().findOne({ where: { codigoBarras: row['codigobarras'] } });

      if (existing) {
        existing.nombre      = row['nombre'];
        existing.precioVenta = precioVenta;
        existing.costo       = parseFloat(row['costo'] || '0') || 0;
        if (row['cantidad']) existing.cantidad = parseInt(row['cantidad'], 10) || existing.cantidad;
        if (row['tamanio'])  existing.tamanio  = row['tamanio'] || undefined;
        existing.categoria   = categoria;
        await artRepo().save(existing);
        actualizados++;
      } else {
        await artRepo().save(artRepo().create({
          codigoBarras: row['codigobarras'],
          nombre:       row['nombre'],
          precioVenta,
          costo:        parseFloat(row['costo'] || '0') || 0,
          cantidad:     row['cantidad'] ? parseInt(row['cantidad'], 10) : undefined,
          tamanio:      row['tamanio'] || undefined,
          categoria,
        }));
        creados++;
      }
    }

    await invalidate();
    return { creados, actualizados, errores };
  }

  async getCategorias(): Promise<Categoria[]> {
    return catRepo().find({ where: { activo: true }, order: { nombre: 'ASC' } });
  }

  async createCategoria(dto: CreateCategoriaDto): Promise<Categoria> {
    const existe = await catRepo().findOne({ where: { nombre: dto.nombre } });
    if (existe) throw new AppError('Ya existe una categoría con ese nombre', 409);
    return catRepo().save(catRepo().create({ nombre: dto.nombre.toUpperCase() }));
  }

  async deleteCategoria(id: number): Promise<void> {
    const cat = await catRepo().findOne({ where: { id } });
    if (!cat) throw new AppError('Categoría no encontrada', 404);
    const count = await artRepo().count({ where: { categoria: { id }, activo: true } });
    if (count > 0) throw new AppError(`No se puede eliminar: tiene ${count} artículo(s) activos`, 400);
    cat.activo = false;
    await catRepo().save(cat);
  }
}
