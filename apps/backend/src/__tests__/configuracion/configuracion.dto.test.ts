import { updateConfiguracionSchema } from '../../modules/configuracion/dto/configuracion.dto';

const basePayload = {
  nombreCompania: 'Mi Negocio SRL',
  rnc: '132428668',
  simboloMoneda: 'RD$',
  numeroDecimales: 2,
  preciosIncluyenImpuesto: true,
  tasaImpuesto1: 18,
  tasaImpuesto2: 0,
  comprobanteDefecto: '02' as const,
  nombreCaja: 'CAJA 1',
  zonaHoraria: 'America/Santo_Domingo',
};

describe('updateConfiguracionSchema', () => {
  it('acepta RNC de 9 u 11 dígitos y normaliza', () => {
    const nine = updateConfiguracionSchema.parse({ ...basePayload, rnc: '1-31-23456-7' });
    expect(nine.rnc).toBe('131234567');

    const eleven = updateConfiguracionSchema.parse({
      ...basePayload,
      rnc: '10123456789',
    });
    expect(eleven.rnc).toBe('10123456789');
  });

  it('rechaza RNC con longitud inválida', () => {
    expect(() =>
      updateConfiguracionSchema.parse({ ...basePayload, rnc: '12345' }),
    ).toThrow(/RNC inválido/);
  });

  it('rechaza tasa ITBIS fuera de rango', () => {
    expect(() =>
      updateConfiguracionSchema.parse({ ...basePayload, tasaImpuesto1: 150 }),
    ).toThrow();
  });

  it('rechama campos desconocidos (strict)', () => {
    expect(() =>
      updateConfiguracionSchema.parse({ ...basePayload, tenantId: 99 }),
    ).toThrow();
  });

  it('requiere nombre de empresa', () => {
    expect(() =>
      updateConfiguracionSchema.parse({ ...basePayload, nombreCompania: '   ' }),
    ).toThrow(/nombre/);
  });

  it('rechaza zona horaria no admitida', () => {
    expect(() =>
      updateConfiguracionSchema.parse({ ...basePayload, zonaHoraria: 'Europe/Madrid' }),
    ).toThrow(/Zona horaria/);
  });
});
