import { AppDataSource } from '../config/database';
import { Venta } from '../entities/Venta.entity';
import { VentasService } from '../modules/ventas/ventas.service';
import { FULL_UPDATE_DESCUENTO_EXCEDE_MSG } from '../modules/ventas/ventas-full-update-totals';
import { AuthUser } from '@pos/shared';

jest.mock('../config/database', () => ({
  AppDataSource: {
    transaction: jest.fn(),
  },
}));

describe('VentasService.update total guard', () => {
  const user: AuthUser = {
    id: 1,
    nombre: 'Admin',
    email: 'admin@example.com',
    rol: 'admin',
    tenantId: 1,
  };

  function makeManager(venta: Venta) {
    const qb = {
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(1),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      }),
      findOne: jest.fn().mockImplementation((entity) => {
        if (entity === Venta) return Promise.resolve(venta);
        return Promise.resolve(null);
      }),
      save: jest.fn().mockImplementation((_entity, value) => Promise.resolve(value)),
    };
    return { manager, qb };
  }

  function mockTransactionWith(manager: ReturnType<typeof makeManager>['manager']) {
    (AppDataSource.transaction as jest.Mock).mockImplementation(async (arg1: unknown, arg2?: unknown) => {
      const cb = typeof arg1 === 'function' ? arg1 : arg2;
      return (cb as (transactionManager: unknown) => Promise<unknown>)(manager);
    });
  }

  beforeEach(() => {
    jest.mocked(AppDataSource.transaction).mockReset();
  });

  it('rejects PATCH descuento that would make total negative with the fullUpdate message', async () => {
    const venta = {
      id: 10,
      subtotal: 100,
      descuento: 0,
      total: 100,
      metodoPago: 'EFECTIVO',
      esDelivery: false,
      deliveryCargo: 0,
      detalles: [],
    } as unknown as Venta;
    const { manager } = makeManager(venta);
    mockTransactionWith(manager);

    await expect(new VentasService().update(venta.id, { descuento: 101 }, user)).rejects.toMatchObject({
      message: FULL_UPDATE_DESCUENTO_EXCEDE_MSG,
      statusCode: 400,
    });
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('allows PATCH descuento equal to subtotal plus delivery and persists total 0', async () => {
    const venta = {
      id: 11,
      subtotal: 100,
      descuento: 0,
      total: 130,
      metodoPago: 'EFECTIVO',
      esDelivery: true,
      deliveryCargo: 30,
      deliveryDireccion: 'Zona 1',
      detalles: [],
    } as unknown as Venta;
    const { manager } = makeManager(venta);
    mockTransactionWith(manager);

    const saved = await new VentasService().update(venta.id, { descuento: 130 }, user);

    expect(saved.total).toBe(0);
    expect(saved.descuento).toBe(130);
    expect(saved.deliveryCargo).toBe(30);
    expect(manager.save).toHaveBeenCalledWith(Venta, expect.objectContaining({ total: 0 }));
  });
});
