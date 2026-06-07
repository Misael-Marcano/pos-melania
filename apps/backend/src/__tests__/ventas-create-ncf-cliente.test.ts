import { createVentaSchema } from '../modules/ventas/dto/ventas.dto';

const base = {
  cajaAperturaId: 1,
  detalles: [{ articuloId: 1, cantidad: 1, precioUnitario: 100 }],
};

describe('createVentaSchema — NCF y cliente', () => {
  it('permite B02 (consumo) sin cliente', () => {
    const dto = createVentaSchema.parse({
      ...base,
      usarNCF: true,
      tipoNCF: '02',
    });
    expect(dto.tipoNCF).toBe('02');
    expect(dto.clienteId).toBeUndefined();
  });

  it('exige cliente para B01 (crédito fiscal)', () => {
    expect(() =>
      createVentaSchema.parse({
        ...base,
        usarNCF: true,
        tipoNCF: '01',
      }),
    ).toThrow();
  });

  it('acepta B01 con cliente', () => {
    const dto = createVentaSchema.parse({
      ...base,
      usarNCF: true,
      tipoNCF: '01',
      clienteId: 5,
    });
    expect(dto.clienteId).toBe(5);
  });
});
