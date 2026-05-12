import { stripVentaDetalleParentRef, syncFullUpdateVentaDetalleGraph } from '../modules/ventas/ventas-full-update-detail-graph';
import { Venta } from '../entities/Venta.entity';
import { VentaDetalle } from '../entities/VentaDetalle.entity';

describe('syncFullUpdateVentaDetalleGraph (fullUpdate cascade / ventaId regression)', () => {
  it('replaces venta.detalles and sets venta on each line so cascade save does not touch stale rows', () => {
    const venta = { id: 7, detalles: [] as VentaDetalle[] } as Venta;
    const stale = { id: 999, venta } as VentaDetalle;
    venta.detalles = [stale];

    const n1 = { id: 10 } as VentaDetalle;
    const n2 = { id: 11 } as VentaDetalle;

    syncFullUpdateVentaDetalleGraph(venta, [n1, n2]);

    expect(venta.detalles).toEqual([n1, n2]);
    expect(n1.venta).toBe(venta);
    expect(n2.venta).toBe(venta);
  });
});

describe('stripVentaDetalleParentRef (JSON / Express response)', () => {
  it('paginated list payload: strip each venta before res.json (findAll pattern)', () => {
    const v1 = { id: 1, detalles: [] as VentaDetalle[] } as Venta;
    const d1 = { id: 10, cantidad: 1, venta: v1 } as VentaDetalle;
    v1.detalles = [d1];
    const v2 = { id: 2, detalles: [] as VentaDetalle[] } as Venta;
    const d2 = { id: 11, cantidad: 2, venta: v2 } as VentaDetalle;
    v2.detalles = [d2];
    const payload = { data: [v1, v2], total: 2, page: 1, limit: 20 };
    expect(() => JSON.stringify(payload)).toThrow();
    for (const v of payload.data) {
      stripVentaDetalleParentRef(v);
    }
    expect(() => JSON.stringify(payload)).not.toThrow();
    const parsed = JSON.parse(JSON.stringify(payload)) as { data: { id: number; detalles: { id: number }[] }[] };
    expect(parsed.data).toHaveLength(2);
    expect(parsed.data[0].detalles[0]).toEqual({ id: 10, cantidad: 1 });
    expect('venta' in (parsed.data[0].detalles[0] as object)).toBe(false);
  });

  it('removes detalle.venta so the venta graph stringifies', () => {
    const venta = { id: 1, subtotal: 0, total: 10, detalles: [] as VentaDetalle[] } as Venta;
    const det = { id: 2, cantidad: 1, venta } as VentaDetalle;
    venta.detalles = [det];
    expect(() => JSON.stringify(venta)).toThrow();

    stripVentaDetalleParentRef(venta);
    expect(det.venta).toBeUndefined();
    expect(JSON.parse(JSON.stringify(venta))).toMatchObject({ id: 1, detalles: [{ id: 2, cantidad: 1 }] });
  });
});
