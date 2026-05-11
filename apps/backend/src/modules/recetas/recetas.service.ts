import { AppDataSource } from '../../config/database';
import { Receta, RecetaIngrediente } from '../../entities/Receta.entity';
import { Articulo } from '../../entities/Articulo.entity';
import { AppError } from '../../middlewares/error.middleware';
import { registrarMovimiento } from '../inventario/inventario.service';
import { tenantIdOrThrow } from '../../utils/tenant-access';
import { assertFeatureEnabled } from '../../saas/enforce-plan';
import { AuthUser } from '@pos/shared';

const repo   = () => AppDataSource.getRepository(Receta);
const artRepo = () => AppDataSource.getRepository(Articulo);

export interface IngredienteInput {
  articuloId: number;
  cantidad:   number;
}

export interface CreateRecetaInput {
  nombre:              string;
  descripcion?:        string;
  articuloResultadoId: number;
  cantidadResultado?:  number;
  ingredientes:        IngredienteInput[];
}

export class RecetasService {

  async findAll(user: AuthUser) {
    const tid = tenantIdOrThrow(user);
    return repo().find({
      where: { activa: true, tenant: { id: tid } },
      order: { nombre: 'ASC' },
    });
  }

  async findById(id: number, user: AuthUser): Promise<Receta> {
    const tid = tenantIdOrThrow(user);
    const r = await repo().findOne({
      where: { id, tenant: { id: tid } },
      relations: ['ingredientes', 'ingredientes.articulo', 'articuloResultado'],
    });
    if (!r) throw new AppError('Receta no encontrada', 404);
    return r;
  }

  async create(data: CreateRecetaInput, user: AuthUser): Promise<Receta> {
    const tid = tenantIdOrThrow(user);
    await assertFeatureEnabled(tid, 'recetas');

    const artRes = await artRepo().findOne({ where: { id: data.articuloResultadoId, tenant: { id: tid } } });
    if (!artRes) throw new AppError('Artículo resultado no encontrado en su organización', 404);
    for (const i of data.ingredientes) {
      const a = await artRepo().findOne({ where: { id: i.articuloId, tenant: { id: tid } } });
      if (!a) throw new AppError(`Ingrediente ID ${i.articuloId} no encontrado en su organización`, 404);
    }

    const receta = repo().create({
      nombre:              data.nombre,
      descripcion:         data.descripcion,
      articuloResultado:   { id: data.articuloResultadoId } as any,
      cantidadResultado:   data.cantidadResultado ?? 1,
      tenant:              { id: tid } as any,
    });

    receta.ingredientes = data.ingredientes.map((i) => {
      const ing = AppDataSource.getRepository(RecetaIngrediente).create({
        articulo: { id: i.articuloId } as any,
        cantidad: i.cantidad,
      });
      return ing;
    });

    return repo().save(receta);
  }

  async update(id: number, data: Partial<CreateRecetaInput>, user: AuthUser): Promise<Receta> {
    const tid = tenantIdOrThrow(user);
    const receta = await this.findById(id, user);
    if (data.nombre)             receta.nombre           = data.nombre;
    if (data.descripcion !== undefined) receta.descripcion = data.descripcion;
    if (data.cantidadResultado)  receta.cantidadResultado = data.cantidadResultado;
    if (data.articuloResultadoId) {
      const a = await artRepo().findOne({ where: { id: data.articuloResultadoId, tenant: { id: tid } } });
      if (!a) throw new AppError('Artículo resultado no encontrado en su organización', 404);
      receta.articuloResultado = { id: data.articuloResultadoId } as any;
    }

    if (data.ingredientes) {
      for (const i of data.ingredientes) {
        const a = await artRepo().findOne({ where: { id: i.articuloId, tenant: { id: tid } } });
        if (!a) throw new AppError(`Ingrediente ID ${i.articuloId} no encontrado en su organización`, 404);
      }
      const ingRepo = AppDataSource.getRepository(RecetaIngrediente);
      await ingRepo.delete({ receta: { id } });
      receta.ingredientes = data.ingredientes.map((i) =>
        ingRepo.create({ articulo: { id: i.articuloId } as any, cantidad: i.cantidad })
      );
    }

    return repo().save(receta);
  }

  async delete(id: number, user: AuthUser): Promise<void> {
    const receta = await this.findById(id, user);
    receta.activa = false;
    await repo().save(receta);
  }

  async producir(id: number, lotes: number, usuarioId: number, user: AuthUser): Promise<{ mensaje: string }> {
    if (lotes <= 0) throw new AppError('La cantidad de lotes debe ser mayor a cero', 400);

    const tid = tenantIdOrThrow(user);
    const receta = await repo().findOne({
      where: { id, tenant: { id: tid } },
      relations: ['ingredientes', 'ingredientes.articulo', 'articuloResultado'],
    });
    if (!receta) throw new AppError('Receta no encontrada', 404);

    const notas = `Producción: ${receta.nombre} (${lotes} lote${lotes !== 1 ? 's' : ''})`;

    return AppDataSource.transaction(async (em) => {
      for (const ing of receta.ingredientes) {
        const art = await em.findOne(Articulo, {
          where: { id: ing.articulo.id, tenant: { id: tid } },
        });
        if (!art) throw new AppError(`Ingrediente ID ${ing.articulo.id} no encontrado`, 404);
        const requerido = Number(ing.cantidad) * lotes;
        const disp = Number(art.cantidad ?? 0);
        if (disp < requerido) {
          throw new AppError(
            `Stock insuficiente de "${art.nombre}": se necesitan ${requerido} pero hay ${disp}`, 400
          );
        }
      }

      for (const ing of receta.ingredientes) {
        const art = await em.findOne(Articulo, {
          where: { id: ing.articulo.id, tenant: { id: tid } },
        });
        if (!art) continue;
        const consumido = Number(ing.cantidad) * lotes;
        const stockAntes = Number(art.cantidad ?? 0);
        const stockDespues = stockAntes - consumido;
        art.cantidad = stockDespues;
        await em.save(Articulo, art);
        await registrarMovimiento({
          articuloId:   art.id,
          tipo:         'SALIDA_MANUAL',
          cantidad:     -consumido,
          stockAntes,
          stockDespues,
          notas,
          usuarioId,
          manager:      em,
        });
      }

      const resultado = await em.findOne(Articulo, {
        where: { id: receta.articuloResultado.id, tenant: { id: tid } },
      });
      if (resultado) {
        const producido = Number(receta.cantidadResultado) * lotes;
        const stockAntes = Number(resultado.cantidad ?? 0);
        const stockDespues = stockAntes + producido;
        resultado.cantidad = stockDespues;
        await em.save(Articulo, resultado);
        await registrarMovimiento({
          articuloId:   resultado.id,
          tipo:         'ENTRADA_MANUAL',
          cantidad:     producido,
          stockAntes,
          stockDespues,
          notas,
          usuarioId,
          manager:      em,
        });
      }

      return { mensaje: `Producción de ${lotes} lote(s) registrada correctamente` };
    });
  }
}
