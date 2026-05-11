import type { AuthUser } from '@pos/shared';
import { AppError } from '../middlewares/error.middleware';
import {
  assertTenantForTienda,
  assertTenantMatch,
  tenantIdOrThrow,
} from '../utils/tenant-access';

const u = (over: Partial<AuthUser> & Pick<AuthUser, 'rol'>): AuthUser => ({
  id: 1,
  nombre: 'n',
  email: 'e@e.e',
  ...over,
});

describe('tenant-access', () => {
  it('tenantIdOrThrow: 401 sin usuario', () => {
    expect(() => tenantIdOrThrow(undefined)).toThrow(AppError);
    expect(() => tenantIdOrThrow(undefined)).toThrow(
      expect.objectContaining({ statusCode: 401 }),
    );
  });

  it('tenantIdOrThrow: plataforma sin tenant → 400', () => {
    expect(() => tenantIdOrThrow(u({ rol: 'plataforma' }))).toThrow(
      expect.objectContaining({ statusCode: 400 }),
    );
  });

  it('tenantIdOrThrow: tenant explícito y default 1', () => {
    expect(tenantIdOrThrow(u({ rol: 'admin', tenantId: 7 }))).toBe(7);
    expect(tenantIdOrThrow(u({ rol: 'admin' }))).toBe(1);
  });

  it('tenantIdOrThrow: tenant no numérico → 403', () => {
    expect(() =>
      tenantIdOrThrow(u({ rol: 'admin', tenantId: Number.NaN })),
    ).toThrow(expect.objectContaining({ statusCode: 403 }));
  });

  it('assertTenantMatch: mismo tenant OK; distinto o null → 403', () => {
    const user = u({ rol: 'admin', tenantId: 2 });
    expect(() => assertTenantMatch(user, 2)).not.toThrow();
    expect(() => assertTenantMatch(user, 3)).toThrow(
      expect.objectContaining({ statusCode: 403 }),
    );
    expect(() => assertTenantMatch(user, null)).toThrow(AppError);
  });

  it('assertTenantForTienda delega en tenant de la tienda', () => {
    const user = u({ rol: 'admin', tenantId: 9 });
    expect(() =>
      assertTenantForTienda(user, { tenant: { id: 9 } } as never),
    ).not.toThrow();
    expect(() =>
      assertTenantForTienda(user, { tenant: { id: 1 } } as never),
    ).toThrow(expect.objectContaining({ statusCode: 403 }));
  });
});
