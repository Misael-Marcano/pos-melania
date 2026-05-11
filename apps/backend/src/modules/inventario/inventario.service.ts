import { ILike, FindOptionsWhere, EntityManager } from 'typeorm';
import { Request } from 'express';
import { AppDataSource } from '../../config/database';
import { Articulo } from '../../entities/Articulo.entity';
import { Categoria } from '../../entities/Categoria.entity';
import { Tenant } from '../../entities/Tenant.entity';
import { MovimientoInventario, TipoMovimiento } from '../../entities/MovimientoInventario.entity';
import { cache } from '../../config/redis';
import { AppError } from '../../middlewares/error.middleware';
import { getPagination } from '../../utils/pagination';
import { CreateArticuloDto, UpdateArticuloDto, CreateCategoriaDto } from './dto/inventario.dto';
import { AuthUser } from '@pos/shared';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { assertTenantMatch, tenantIdOrThrow } from '../../utils/tenant-access';
import { assertTenantCanAddArticulo } from '../../saas/enforce-plan';

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
const ART_KEY = (tenantId: number, id: number) => `articulo:${tenantId}:${id}`;

const invalidate = async (tenantId?: number, id?: number) => {
  await cache.delPattern('inventario:list*');
  if (tenantId != null && id != null) await cache.del(ART_KEY(tenantId, id));
};

function tenantRef(user: AuthUser): { id: number } {
  return { id: tenantIdOrThrow(user) };
}

export class InventarioService {

  async findAll(req: AuthRequest) {
    const user = req.user!;
    const tid  = tenantIdOrThrow(user);
    const { page, limit, skip } = getPagination(req);
    const { q, categoriaId, campo = 'todo' } = req.query as Record<string, string>;

    const cacheKey = `inventario:list:${tid}:${page}:${limit}:${q ?? ''}:${categoriaId ?? ''}:${campo}`;
    const cached   = await cache.get<{ data: Articulo[]; total: number }>(cacheKey);
    if (cached) return { ...cached, page, limit };

    const T: FindOptionsWhere<Articulo> = { tenant: tenantRef(user), activo: true };
    const catFilter = categoriaId ? { categoria: { id: +categoriaId, tenant: tenantRef(user) } } : {};

    let where: FindOptionsWhere<Articulo> | FindOptionsWhere<Articulo>[];

    if (q && campo === 'nombre') {
      where = { ...T, ...catFilter, nombre: ILike(`%${q}%`) };
    } else if (q && campo === 'codigoBarras') {
      where = { ...T, codigoBarras: ILike(`%${q}%`) };
    } else if (q) {
      where = [
        { ...T, ...catFilter, nombre: ILike(`%${q}%`) },
        { ...T, codigoBarras: ILike(`%${q}%`) },
      ];
    } else {
      where = { ...T, ...catFilter };
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

  async findById(id: number, user: AuthUser): Promise<Articulo> {
    const tid = tenantIdOrThrow(user);
    const ck = ART_KEY(tid, id);
    const cached = await cache.get<Articulo>(ck);
    if (cached) return cached;
    const art = await artRepo().findOne({
      where: { id, activo: true, tenant: { id: tid } },
      relations: ['categoria', 'tenant'],
    });
    if (!art) throw new AppError('Artículo no encontrado', 404);
    await cache.set(ck, art, 120);
    return art;
  }

  async findByBarcode(codigo: string, user: AuthUser): Promise<Articulo> {
    const art = await artRepo().findOne({
      where: { codigoBarras: codigo, activo: true, tenant: tenantRef(user) },
      relations: ['categoria', 'tenant'],
    });
    if (!art) throw new AppError(`No se encontró artículo con código "${codigo}"`, 404);
    return art;
  }

  async create(dto: CreateArticuloDto, user: AuthUser): Promise<Articulo> {
    const tid = tenantIdOrThrow(user);
    await assertTenantCanAddArticulo(tid);
    const categoria = await catRepo().findOne({
      where: { id: dto.categoriaId, tenant: { id: tid } },
    });
    if (!categoria) throw new AppError('Categoría no encontrada', 404);
    const existe = await artRepo().findOne({
      where: { codigoBarras: dto.codigoBarras, tenant: { id: tid } },
    });
    if (existe) throw new AppError(`Ya existe un artículo con el código "${dto.codigoBarras}"`, 409);
    const { categoriaId, ...rest } = dto;
    const saved = await artRepo().save(
      artRepo().create({
        ...rest,
        categoria,
        tenant: { id: tid } as Tenant,
      }),
    );
    await invalidate();
    return saved;
  }

  async update(id: number, dto: UpdateArticuloDto, user: AuthUser): Promise<Articulo> {
    const tid = tenantIdOrThrow(user);
    const art = await artRepo().findOne({ where: { id }, relations: ['categoria', 'tenant'] });
    if (!art) throw new AppError('Artículo no encontrado', 404);
    assertTenantMatch(user, art.tenant?.id);
    if (dto.categoriaId) {
      const cat = await catRepo().findOne({
        where: { id: dto.categoriaId, tenant: { id: tid } },
      });
      if (!cat) throw new AppError('Categoría no encontrada', 404);
      art.categoria = cat;
    }
    if (dto.codigoBarras && dto.codigoBarras !== art.codigoBarras) {
      const dup = await artRepo().findOne({
        where: { codigoBarras: dto.codigoBarras, tenant: { id: tid } },
      });
      if (dup && dup.id !== id) throw new AppError('Código de barras ya está en uso', 409);
    }
    const { categoriaId, ...rest } = dto;
    Object.assign(art, rest);
    const saved = await artRepo().save(art);
    await invalidate(tid, id);
    return saved;
  }

  async clone(id: number, user: AuthUser): Promise<Articulo> {
    const art = await this.findById(id, user);
    const tid = tenantIdOrThrow(user);
    const base = art.nombre.replace(/ \(copia.*\)$/, '');
    const copias = await artRepo().count({
      where: { nombre: ILike(`${base} (copia%`), tenant: { id: tid } },
    });
    const suffix = copias > 0 ? ` (copia ${copias + 1})` : ' (copia)';
    const clone = artRepo().create({
      ...art,
      id: undefined as any,
      nombre: `${base}${suffix}`,
      codigoBarras: `${art.codigoBarras}-${Date.now().toString().slice(-4)}`,
      cantidad: 0,
      tenant: { id: tid } as Tenant,
    });
    const saved = await artRepo().save(clone);
    await invalidate();
    return saved;
  }

  async delete(id: number, user: AuthUser): Promise<void> {
    const tid = tenantIdOrThrow(user);
    await this.findById(id, user);
    const art = await artRepo().findOne({ where: { id, tenant: { id: tid } } });
    if (!art) throw new AppError('Artículo no encontrado', 404);
    art.activo = false;
    await artRepo().save(art);
    await invalidate(tid, id);
  }

  async ajustarInventario(id: number, cantidad: number, user: AuthUser): Promise<Articulo> {
    const tid = tenantIdOrThrow(user);
    await this.findById(id, user);
    const art = await artRepo().findOne({ where: { id, tenant: { id: tid } } });
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
      usuarioId:    user.id,
    });
    await invalidate(tid, id);
    return saved;
  }

  async getMovimientos(articuloId: number, req: Request, user: AuthUser) {
    await this.findById(articuloId, user);
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

  async getStockBajo(minimo: number, user: AuthUser): Promise<Articulo[]> {
    const tid = tenantIdOrThrow(user);
    return artRepo()
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.categoria', 'c')
      .where('a.activo = 1')
      .andWhere('a.tenantId = :tid', { tid })
      .andWhere('a.cantidad IS NOT NULL')
      .andWhere('a.cantidad <= :minimo', { minimo })
      .orderBy('a.cantidad', 'ASC')
      .getMany();
  }

  async importarCSV(csv: string, user: AuthUser): Promise<{ creados: number; actualizados: number; errores: string[] }> {
    const tid = tenantIdOrThrow(user);
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

      const categoria = await catRepo().findOne({ where: { id: catId, tenant: { id: tid } } });
      if (!categoria) { errores.push(`Fila ${i + 1}: categoría ID ${catId} no existe`); continue; }

      const existing = await artRepo().findOne({
        where: { codigoBarras: row['codigobarras'], tenant: { id: tid } },
      });

      if (existing) {
        existing.nombre      = row['nombre'];
        existing.precioVenta = precioVenta;
        existing.costo       = parseFloat(row['costo'] || '0') || 0;
        if (row['cantidad']) existing.cantidad = parseInt(row['cantidad'], 10) || existing.cantidad;
        if (row['tamanio'])  existing.tamanio  = row['tamanio'] || undefined;
        if (row['unidadmedida'] !== undefined) {
          const u = row['unidadmedida']?.trim();
          existing.unidadMedida = u ? u : null;
        }
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
          unidadMedida: row['unidadmedida']?.trim() || null,
          categoria,
          tenant:       { id: tid } as Tenant,
        }));
        creados++;
      }
    }

    await invalidate();
    return { creados, actualizados, errores };
  }

  async getCategorias(user: AuthUser): Promise<Categoria[]> {
    return catRepo().find({
      where: { activo: true, tenant: tenantRef(user) },
      order: { nombre: 'ASC' },
    });
  }

  async createCategoria(dto: CreateCategoriaDto, user: AuthUser): Promise<Categoria> {
    const tid = tenantIdOrThrow(user);
    const existe = await catRepo().findOne({
      where: { nombre: dto.nombre.toUpperCase(), tenant: { id: tid } },
    });
    if (existe) throw new AppError('Ya existe una categoría con ese nombre', 409);
    return catRepo().save(
      catRepo().create({
        nombre: dto.nombre.toUpperCase(),
        tenant: { id: tid } as Tenant,
      }),
    );
  }

  async deleteCategoria(id: number, user: AuthUser): Promise<void> {
    const tid = tenantIdOrThrow(user);
    const cat = await catRepo().findOne({ where: { id }, relations: ['tenant'] });
    if (!cat) throw new AppError('Categoría no encontrada', 404);
    assertTenantMatch(user, cat.tenant?.id);
    const count = await artRepo().count({
      where: { categoria: { id }, activo: true, tenant: { id: tid } },
    });
    if (count > 0) throw new AppError(`No se puede eliminar: tiene ${count} artículo(s) activos`, 400);
    cat.activo = false;
    await catRepo().save(cat);
  }
}
