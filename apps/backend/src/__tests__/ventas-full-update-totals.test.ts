import {
  computeFullUpdateVentaTotals,
  FULL_UPDATE_DESCUENTO_EXCEDE_MSG,
  fullUpdateVentaTotalViolationMessage,
} from '../modules/ventas/ventas-full-update-totals';
import { AppError } from '../middlewares/error.middleware';

describe('computeFullUpdateVentaTotals (fullUpdate / FullUpdateVentaDto delivery + total)', () => {
  it('adds delivery cargo when esDelivery is true: total = subtotal - descuento + deliveryCargo', () => {
    const r = computeFullUpdateVentaTotals({
      subtotal: 200,
      descuento: 20,
      venta: { esDelivery: false, deliveryCargo: 0 },
      dto: { esDelivery: true, deliveryCargo: 35 },
    });
    expect(r.esDelivery).toBe(true);
    expect(r.deliveryCargo).toBe(35);
    expect(r.total).toBe(200 - 20 + 35);
  });

  it('zeros delivery cargo when esDelivery is false (ignores dto.deliveryCargo)', () => {
    const r = computeFullUpdateVentaTotals({
      subtotal: 100,
      descuento: 10,
      venta: { esDelivery: true, deliveryCargo: 50 },
      dto: { esDelivery: false, deliveryCargo: 999 },
    });
    expect(r.esDelivery).toBe(false);
    expect(r.deliveryCargo).toBe(0);
    expect(r.total).toBe(90);
  });

  it('when dto.esDelivery is omitted, inherits venta.esDelivery and falls back venta.deliveryCargo', () => {
    const r = computeFullUpdateVentaTotals({
      subtotal: 80,
      descuento: 5,
      venta: { esDelivery: true, deliveryCargo: 12 },
      dto: {},
    });
    expect(r.esDelivery).toBe(true);
    expect(r.deliveryCargo).toBe(12);
    expect(r.total).toBe(80 - 5 + 12);
  });

  it('explicit dto.deliveryCargo 0 overrides stored venta cargo', () => {
    const r = computeFullUpdateVentaTotals({
      subtotal: 50,
      descuento: 0,
      venta: { esDelivery: true, deliveryCargo: 25 },
      dto: { deliveryCargo: 0 },
    });
    expect(r.deliveryCargo).toBe(0);
    expect(r.total).toBe(50);
  });

  it('when esDelivery true and dto omits deliveryCargo, uses Number(venta.deliveryCargo ?? 0)', () => {
    const r = computeFullUpdateVentaTotals({
      subtotal: 30,
      descuento: 0,
      venta: { esDelivery: true, deliveryCargo: null },
      dto: { esDelivery: true },
    });
    expect(r.deliveryCargo).toBe(0);
    expect(r.total).toBe(30);
  });

  it('clears deliveryDireccion when not delivery', () => {
    const r = computeFullUpdateVentaTotals({
      subtotal: 10,
      descuento: 0,
      venta: { esDelivery: true, deliveryDireccion: 'Calle 1' },
      dto: { esDelivery: false },
    });
    expect(r.deliveryDireccion).toBeNull();
  });

  it('keeps or overrides dirección when delivery', () => {
    expect(
      computeFullUpdateVentaTotals({
        subtotal: 10,
        descuento: 0,
        venta: { esDelivery: true, deliveryDireccion: 'Old' },
        dto: { esDelivery: true },
      }).deliveryDireccion,
    ).toBe('Old');

    expect(
      computeFullUpdateVentaTotals({
        subtotal: 10,
        descuento: 0,
        venta: { esDelivery: true, deliveryDireccion: 'Old' },
        dto: { esDelivery: true, deliveryDireccion: 'New' },
      }).deliveryDireccion,
    ).toBe('New');
  });

  it('allows total 0 when descuento equals subtotal + delivery cargo (no violation)', () => {
    const r = computeFullUpdateVentaTotals({
      subtotal: 100,
      descuento: 130,
      venta: { esDelivery: true, deliveryCargo: 30 },
      dto: { esDelivery: true },
    });
    expect(r.total).toBe(0);
    expect(fullUpdateVentaTotalViolationMessage(r.total)).toBeNull();
  });

  it('rejects over-discount: violation message and AppError 400 (fullUpdate path)', () => {
    const r = computeFullUpdateVentaTotals({
      subtotal: 50,
      descuento: 80,
      venta: { esDelivery: false },
      dto: {},
    });
    expect(r.total).toBe(-30);
    const violation = fullUpdateVentaTotalViolationMessage(r.total);
    expect(violation).toBe(FULL_UPDATE_DESCUENTO_EXCEDE_MSG);
    expect(() => {
      if (violation) throw new AppError(violation, 400);
    }).toThrow(AppError);
    expect(() => {
      if (violation) throw new AppError(violation, 400);
    }).toThrow(FULL_UPDATE_DESCUENTO_EXCEDE_MSG);
  });
});
