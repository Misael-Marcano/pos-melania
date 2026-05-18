import { rowsToCountMap, pickUsage } from '../saas/tenant-panel-usage-batch';

describe('tenant-panel-usage-batch', () => {
  it('rowsToCountMap agrupa por tenantId', () => {
    const m = rowsToCountMap([
      { tenantId: 1, cnt: '3' },
      { tenantId: 2, cnt: 10 },
    ]);
    expect(m.get(1)).toBe(3);
    expect(m.get(2)).toBe(10);
    expect(m.get(99)).toBeUndefined();
  });

  it('pickUsage devuelve ceros si el tenant no tiene filas', () => {
    const usage = pickUsage(
      {
        seats:           new Map([[1, 2]]),
        tiendas:         new Map(),
        articulos:       new Map(),
        ventasMesActual: new Map([[1, 5]]),
      },
      2,
    );
    expect(usage).toEqual({
      seats: 0,
      tiendasActivas: 0,
      articulosActivos: 0,
      ventasMesActual: 0,
    });
  });
});
