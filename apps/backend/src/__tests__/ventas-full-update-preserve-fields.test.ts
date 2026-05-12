import { fullUpdateVentaSchema } from '../modules/ventas/dto/ventas.dto';

/**
 * fullUpdate() only mutates venta.cliente / venta.notas when the key is present
 * on the parsed DTO (`'clienteId' in dto`, `'notas' in dto`). These tests lock the
 * Zod parse shape so partial payloads cannot clear cliente/notas by accident.
 */
describe('fullUpdateVentaSchema (omit-to-preserve keys for fullUpdate)', () => {
  const base = {
    metodoPago: 'EFECTIVO' as const,
    descuento: 0,
    detalles: [{ articuloId: 1, cantidad: 1, precioUnitario: 10 }],
  };

  it('omits clienteId when not sent — service must preserve venta.cliente', () => {
    const dto = fullUpdateVentaSchema.parse(base);
    expect('clienteId' in dto).toBe(false);
  });

  it('keeps clienteId key when explicitly null — service clears cliente', () => {
    const dto = fullUpdateVentaSchema.parse({ ...base, clienteId: null });
    expect('clienteId' in dto).toBe(true);
    expect(dto.clienteId).toBeNull();
  });

  it('keeps clienteId key when a number — service assigns cliente', () => {
    const dto = fullUpdateVentaSchema.parse({ ...base, clienteId: 42 });
    expect('clienteId' in dto).toBe(true);
    expect(dto.clienteId).toBe(42);
  });

  it('omits notas when not sent — service must preserve venta.notas', () => {
    const dto = fullUpdateVentaSchema.parse(base);
    expect('notas' in dto).toBe(false);
  });

  it('keeps notas key when explicitly null', () => {
    const dto = fullUpdateVentaSchema.parse({ ...base, notas: null });
    expect('notas' in dto).toBe(true);
    expect(dto.notas).toBeNull();
  });

  it('keeps notas key when a string', () => {
    const dto = fullUpdateVentaSchema.parse({ ...base, notas: 'x' });
    expect('notas' in dto).toBe(true);
    expect(dto.notas).toBe('x');
  });
});
