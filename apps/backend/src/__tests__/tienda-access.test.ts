import type { AuthUser } from '@pos/shared';
import { AppError } from '../middlewares/error.middleware';
import {
  assertTiendaCaja,
  assertTiendaSucursalParam,
  isAdmin,
  tiendaIdForUserOrThrow,
} from '../utils/tienda-access';

const u = (over: Partial<AuthUser> & Pick<AuthUser, 'rol'>): AuthUser => ({
  id: 1,
  nombre: 'n',
  email: 'e@e.e',
  ...over,
});

describe('tienda-access', () => {
  it('isAdmin: admin y plataforma', () => {
    expect(isAdmin(u({ rol: 'admin' }))).toBe(true);
    expect(isAdmin(u({ rol: 'plataforma' }))).toBe(true);
    expect(isAdmin(u({ rol: 'cajero', tiendaId: 1 }))).toBe(false);
    expect(isAdmin(u({ rol: 'soporte', tiendaId: 1 }))).toBe(false);
  });

  it('tiendaIdForUserOrThrow: admin/plataforma → null', () => {
    expect(tiendaIdForUserOrThrow(u({ rol: 'admin' }))).toBeNull();
    expect(tiendaIdForUserOrThrow(u({ rol: 'plataforma', tiendaId: 2 }))).toBeNull();
  });

  it('tiendaIdForUserOrThrow: sin sucursal → 403', () => {
    expect(() => tiendaIdForUserOrThrow(u({ rol: 'cajero' }))).toThrow(
      expect.objectContaining({ statusCode: 403 }),
    );
  });

  it('tiendaIdForUserOrThrow: sucursal asignada', () => {
    expect(tiendaIdForUserOrThrow(u({ rol: 'cajero', tiendaId: 5 }))).toBe(5);
  });

  it('assertTiendaCaja: admin sin comprobación', () => {
    expect(() =>
      assertTiendaCaja(u({ rol: 'admin' }), undefined),
    ).not.toThrow();
  });

  it('assertTiendaCaja: sin tienda usuario → 403', () => {
    expect(() => assertTiendaCaja(u({ rol: 'cajero' }), 1)).toThrow(
      expect.objectContaining({ statusCode: 403 }),
    );
  });

  it('assertTiendaCaja: caja de otra sucursal o sin tienda → 403', () => {
    const user = u({ rol: 'cajero', tiendaId: 3 });
    expect(() => assertTiendaCaja(user, 3)).not.toThrow();
    expect(() => assertTiendaCaja(user, 4)).toThrow(
      expect.objectContaining({ statusCode: 403 }),
    );
    expect(() => assertTiendaCaja(user, null)).toThrow(AppError);
    expect(() => assertTiendaCaja(user, undefined)).toThrow(AppError);
  });

  it('assertTiendaSucursalParam: admin omite', () => {
    expect(() =>
      assertTiendaSucursalParam(u({ rol: 'admin' }), 99),
    ).not.toThrow();
  });

  it('assertTiendaSucursalParam: sucursal distinta o sin asignar → 403', () => {
    const user = u({ rol: 'cajero', tiendaId: 2 });
    expect(() => assertTiendaSucursalParam(user, 2)).not.toThrow();
    expect(() => assertTiendaSucursalParam(user, 1)).toThrow(
      expect.objectContaining({ statusCode: 403 }),
    );
    expect(() => assertTiendaSucursalParam(u({ rol: 'cajero' }), 1)).toThrow(
      expect.objectContaining({ statusCode: 403 }),
    );
  });
});
