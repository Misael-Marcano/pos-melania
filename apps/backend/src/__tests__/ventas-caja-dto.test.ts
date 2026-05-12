import { aperturaCajaSchema, cierreCajaSchema } from '../modules/ventas/dto/ventas.dto';

const denominaciones = {
  '2000': 1,
  '1000': 0,
  '500': 0,
  '200': 0,
  '100': 0,
  '50': 0,
  '25': 0,
  '10': 0,
  '5': 0,
  '1': 0,
};

describe('ventas caja DTO', () => {
  it('accepts apertura when amount matches denominations', () => {
    const dto = aperturaCajaSchema.parse({
      cajaId: 1,
      denominaciones,
      montoApertura: 2000,
    });

    expect(dto.montoApertura).toBe(2000);
  });

  it('rejects mismatched apertura totals', () => {
    expect(() =>
      aperturaCajaSchema.parse({
        cajaId: 1,
        denominaciones,
        montoApertura: 1999,
      }),
    ).toThrow();
  });

  it('rejects invalid denominations and negative counts', () => {
    expect(() =>
      cierreCajaSchema.parse({
        aperturaId: 1,
        denominaciones: { ...denominaciones, '3': 1, '100': -1 },
        montoCierre: 2000,
      }),
    ).toThrow();
  });
});
