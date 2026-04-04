import { ILike, FindOptionsWhere } from 'typeorm';
import { Request } from 'express';
import { AppDataSource } from '../../config/database';
import { Cliente }     from '../../entities/Cliente.entity';
import { Venta }       from '../../entities/Venta.entity';
import { PagoCredito } from '../../entities/PagoCredito.entity';
import { AppError }    from '../../middlewares/error.middleware';
import { getPagination } from '../../utils/pagination';
import { CreateClienteDto, UpdateClienteDto } from './dto/cliente.dto';

const repo = () => AppDataSource.getRepository(Cliente);

export class ClientesService {
  async findAll(req: Request) {
    const { page, limit, skip } = getPagination(req);
    const q = req.query.q as string | undefined;

    let where: FindOptionsWhere<Cliente> | FindOptionsWhere<Cliente>[] = { activo: true };
    if (q) {
      where = [
        { activo: true, nombre:               ILike(`%${q}%`) },
        { activo: true, numeroIdentificacion: ILike(`%${q}%`) },
      ];
    }

    const [data, total] = await repo().findAndCount({
      where,
      order: { nombre: 'ASC' },
      skip,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async findById(id: number): Promise<Cliente> {
    const c = await repo().findOne({ where: { id, activo: true } });
    if (!c) throw new AppError('Cliente no encontrado', 404);
    return c;
  }

  async create(dto: CreateClienteDto): Promise<Cliente> {
    const c = repo().create(dto);
    return repo().save(c);
  }

  async update(id: number, dto: UpdateClienteDto): Promise<Cliente> {
    const c = await this.findById(id);
    Object.assign(c, dto);
    return repo().save(c);
  }

  async delete(id: number): Promise<void> {
    const c = await this.findById(id);
    c.activo = false;
    await repo().save(c);
  }

  async getHistorialVentas(id: number) {
    const c = await repo().findOne({
      where: { id },
      relations: ['ventas', 'ventas.detalles', 'ventas.detalles.articulo'],
      order: { ventas: { fecha: 'DESC' } },
    });
    if (!c) throw new AppError('Cliente no encontrado', 404);
    return c.ventas;
  }

  // ── Crédito ───────────────────────────────────────────────────────────────

  async getEstadoCuenta(clienteId: number) {
    const cliente = await this.findById(clienteId);

    // Ventas en crédito (cargos)
    const ventaRepo = AppDataSource.getRepository(Venta);
    const ventasCredito = await ventaRepo.find({
      where: { cliente: { id: clienteId }, metodoPago: 'CREDITO' },
      relations: ['detalles', 'detalles.articulo'],
      order: { fecha: 'DESC' },
    });

    // Pagos recibidos (abonos)
    const pagoRepo = AppDataSource.getRepository(PagoCredito);
    const pagos = await pagoRepo.find({
      where: { cliente: { id: clienteId } },
      relations: ['creadoPor'],
      order: { createdAt: 'DESC' },
    });

    // Construir ledger unificado ordenado por fecha
    const movimientos = [
      ...ventasCredito.map((v) => ({
        tipo:      'CARGO' as const,
        fecha:     v.fecha,
        monto:     Number(v.total),
        notas:     `Venta #${String(v.id).padStart(6, '0')}`,
        referencia: v.id,
      })),
      ...pagos.map((p) => ({
        tipo:       'ABONO' as const,
        fecha:      p.createdAt,
        monto:      Number(p.monto),
        notas:      p.notas ?? 'Pago recibido',
        referencia: p.id,
        creadoPor:  p.creadoPor?.nombre,
      })),
    ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    return {
      cliente: {
        id:      cliente.id,
        nombre:  cliente.nombre,
        correo:  cliente.correo,
        telefono: cliente.telefono,
        saldo:   Number(cliente.saldo),
      },
      movimientos,
      totalCargos:  movimientos.filter((m) => m.tipo === 'CARGO').reduce((s, m) => s + m.monto, 0),
      totalAbonos:  movimientos.filter((m) => m.tipo === 'ABONO').reduce((s, m) => s + m.monto, 0),
    };
  }

  async registrarAbono(clienteId: number, monto: number, notas: string | undefined, usuarioId: number) {
    const cliente = await this.findById(clienteId);

    if (monto <= 0) throw new AppError('El monto debe ser mayor a cero', 400);
    if (monto > Number(cliente.saldo)) {
      throw new AppError(`El monto (${monto}) supera el saldo pendiente (${cliente.saldo})`, 400);
    }

    return AppDataSource.transaction(async (em) => {
      const pago = em.getRepository(PagoCredito).create({
        monto,
        notas,
        cliente:    { id: clienteId } as any,
        creadoPor:  { id: usuarioId } as any,
      });
      await em.save(PagoCredito, pago);

      cliente.saldo = Number(cliente.saldo) - monto;
      await em.save(Cliente, cliente);

      return { pago, saldoActual: cliente.saldo };
    });
  }

  async getClientesConSaldo() {
    const [data, total] = await repo().findAndCount({
      where: { activo: true },
      order: { saldo: 'DESC' },
    });
    // Solo los que tienen saldo > 0
    const conDeuda = data.filter((c) => Number(c.saldo) > 0);
    return { data: conDeuda, total: conDeuda.length };
  }
}
