import { AppDataSource } from '../../config/database';
import { Receta, RecetaIngrediente } from '../../entities/Receta.entity';
import { Articulo } from '../../entities/Articulo.entity';
import { AppError } from '../../middlewares/error.middleware';
import { registrarMovimiento } from '../inventario/inventario.service';

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

  async findAll() {
    return repo().find({
      where: { activa: true },
      order: { nombre: 'ASC' },
    });
  }

  async findById(id: number): Promise<Receta> {
    const r = await repo().findOne({ where: { id } });
    if (!r) throw new AppError('Receta no encontrada', 404);
    return r;
  }

  async create(data: CreateRecetaInput): Promise<Receta> {
    const receta = repo().create({
      nombre:              data.nombre,
      descripcion:         data.descripcion,
      articuloResultado:   { id: data.articuloResultadoId } as any,
      cantidadResultado:   data.cantidadResultado ?? 1,
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

  async update(id: number, data: Partial<CreateRecetaInput>): Promise<Receta> {
    const receta = await this.findById(id);
    if (data.nombre)             receta.nombre           = data.nombre;
    if (data.descripcion !== undefined) receta.descripcion = data.descripcion;
    if (data.cantidadResultado)  receta.cantidadResultado = data.cantidadResultado;
    if (data.articuloResultadoId) receta.articuloResultado = { id: data.articuloResultadoId } as any;

    if (data.ingredientes) {
      const ingRepo = AppDataSource.getRepository(RecetaIngrediente);
      await ingRepo.delete({ receta: { id } });
      receta.ingredientes = data.ingredientes.map((i) =>
        ingRepo.create({ articulo: { id: i.articuloId } as any, cantidad: i.cantidad })
      );
    }

    return repo().save(receta);
  }

  async delete(id: number): Promise<void> {
    const receta = await this.findById(id);
    receta.activa = false;
    await repo().save(receta);
  }

  /** Ejecutar producción: consume ingredientes y agrega stock al artículo resultado */
  async producir(id: number, lotes: number, usuarioId: number): Promise<{ mensaje: string }> {
    if (lotes <= 0) throw new AppError('La cantidad de lotes debe ser mayor a cero', 400);

    const receta = await this.findById(id);

    return AppDataSource.transaction(async (em) => {
      // Verificar stock de ingredientes
      for (const ing of receta.ingredientes) {
        const art = await em.findOne(Articulo, { where: { id: ing.articulo.id } });
        if (!art) throw new AppError(`Ingrediente ID ${ing.articulo.id} no encontrado`, 404);
        const requerido = Number(ing.cantidad) * lotes;
        if (art.cantidad !== null && art.cantidad < requerido) {
          throw new AppError(
            `Stock insuficiente de "${art.nombre}": se necesitan ${requerido} pero hay ${art.cantidad}`, 400
          );
        }
      }

      // Descontar ingredientes
      for (const ing of receta.ingredientes) {
        const art = await em.findOne(Articulo, { where: { id: ing.articulo.id } });
        if (art && art.cantidad !== null) {
          const consumido = Number(ing.cantidad) * lotes;
          art.cantidad -= consumido;
          await em.save(Articulo, art);
          await registrarMovimiento(art.id, 'SALIDA_MANUAL', -consumido, usuarioId,
            `Producción: ${receta.nombre} (${lotes} lote${lotes !== 1 ? 's' : ''})`, em);
        }
      }

      // Agregar stock del artículo resultado
      const resultado = await em.findOne(Articulo, { where: { id: receta.articuloResultado.id } });
      if (resultado) {
        const producido = Number(receta.cantidadResultado) * lotes;
        if (resultado.cantidad !== null) resultado.cantidad += producido;
        else resultado.cantidad = producido;
        await em.save(Articulo, resultado);
        await registrarMovimiento(resultado.id, 'ENTRADA_MANUAL', producido, usuarioId,
          `Producción: ${receta.nombre} (${lotes} lote${lotes !== 1 ? 's' : ''})`, em);
      }

      return { mensaje: `Producción de ${lotes} lote(s) registrada correctamente` };
    });
  }
}
