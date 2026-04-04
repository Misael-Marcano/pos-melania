import { ILike } from 'typeorm';
import { Request } from 'express';
import { AppDataSource } from '../../config/database';
import { TarjetaRegalo, MovimientoTarjeta } from '../../entities/TarjetaRegalo.entity';
import { AppError } from '../../middlewares/error.middleware';
import { getPagination } from '../../utils/pagination';
import { AuthUser } from '@pos/shared';
import {
  CreateTarjetaDto, RecargarTarjetaDto,
  UsarTarjetaDto, UpdateTarjetaDto,
} from './dto/tarjetas-regalo.dto';

const repo = () => AppDataSource.getRepository(TarjetaRegalo);

function generateCodigo(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `GC-${seg()}-${seg()}`;
}

function getMovimientos(t: TarjetaRegalo): MovimientoTarjeta[] {
  try { return JSON.parse(t.movimientosJson ?? '[]'); } catch { return []; }
}

export class TarjetasRegaloService {
  async findAll(req: Request) {
    const { page, limit, skip } = getPagination(req);
    const q      = req.query.q      as string | undefined;
    const estado = req.query.estado as string | undefined;

    const where: Record<string, unknown> = {};
    if (q)      where.codigo = ILike(`%${q}%`);
    if (estado) where.estado = estado;

    const [data, total] = await repo().findAndCount({
      where,
      relations: ['creadoPor'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async findById(id: number): Promise<TarjetaRegalo> {
    const t = await repo().findOne({ where: { id }, relations: ['creadoPor'] });
    if (!t) throw new AppError('Tarjeta de regalo no encontrada', 404);
    return t;
  }

  async findByCodigo(codigo: string): Promise<TarjetaRegalo> {
    const t = await repo().findOne({ where: { codigo: codigo.toUpperCase() }, relations: ['creadoPor'] });
    if (!t) throw new AppError('Tarjeta de regalo no encontrada', 404);
    return t;
  }

  async create(dto: CreateTarjetaDto, user: AuthUser): Promise<TarjetaRegalo> {
    // Generar código único
    let codigo = generateCodigo();
    while (await repo().findOne({ where: { codigo } })) {
      codigo = generateCodigo();
    }

    const mov: MovimientoTarjeta = {
      tipo:  'CREACION',
      monto: dto.saldoInicial,
      fecha: new Date().toISOString(),
      notas: 'Creación de tarjeta',
    };

    const t = repo().create({
      codigo,
      saldoInicial:     dto.saldoInicial,
      saldoActual:      dto.saldoInicial,
      estado:           'ACTIVA',
      fechaVencimiento: dto.fechaVencimiento ? new Date(dto.fechaVencimiento) : null,
      notas:            dto.notas,
      movimientosJson:  JSON.stringify([mov]),
      creadoPor:        { id: user.id } as any,
    });
    return repo().save(t);
  }

  async recargar(id: number, dto: RecargarTarjetaDto): Promise<TarjetaRegalo> {
    const t = await this.findById(id);
    if (t.estado === 'CANCELADA') throw new AppError('La tarjeta está cancelada', 400);
    if (t.estado === 'VENCIDA')   throw new AppError('La tarjeta está vencida', 400);

    const movs = getMovimientos(t);
    movs.push({ tipo: 'RECARGA', monto: dto.monto, fecha: new Date().toISOString(), notas: dto.notas });

    const nuevoSaldo = Number(t.saldoActual) + dto.monto;
    await repo().update(id, {
      saldoActual:     nuevoSaldo,
      estado:          'ACTIVA',
      movimientosJson: JSON.stringify(movs),
    });
    return this.findById(id);
  }

  async usar(id: number, dto: UsarTarjetaDto): Promise<TarjetaRegalo> {
    const t = await this.findById(id);
    if (t.estado !== 'ACTIVA') throw new AppError(`La tarjeta no está activa (estado: ${t.estado})`, 400);

    // Verificar vencimiento
    if (t.fechaVencimiento && new Date(t.fechaVencimiento) < new Date()) {
      await repo().update(id, { estado: 'VENCIDA' });
      throw new AppError('La tarjeta está vencida', 400);
    }

    if (dto.monto > Number(t.saldoActual)) {
      throw new AppError(`Saldo insuficiente. Disponible: ${t.saldoActual}`, 400);
    }

    const movs = getMovimientos(t);
    movs.push({ tipo: 'USO', monto: dto.monto, fecha: new Date().toISOString(), notas: dto.notas });

    const nuevoSaldo = Number(t.saldoActual) - dto.monto;
    const nuevoEstado = nuevoSaldo <= 0 ? 'AGOTADA' : 'ACTIVA';

    await repo().update(id, {
      saldoActual:     nuevoSaldo,
      estado:          nuevoEstado,
      movimientosJson: JSON.stringify(movs),
    });
    return this.findById(id);
  }

  async update(id: number, dto: UpdateTarjetaDto): Promise<TarjetaRegalo> {
    await this.findById(id);
    const upd: Record<string, unknown> = {};
    if (dto.notas            !== undefined) upd.notas            = dto.notas;
    if (dto.estado           !== undefined) upd.estado           = dto.estado;
    if (dto.fechaVencimiento !== undefined) upd.fechaVencimiento = dto.fechaVencimiento
      ? new Date(dto.fechaVencimiento) : null;
    await repo().update(id, upd);
    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    const t = await this.findById(id);
    await repo().remove(t);
  }
}
