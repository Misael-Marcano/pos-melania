import {
  isIntegrationCajaSession,
  mapCajaAperturaHistorial,
  serializeCajaFecha,
} from '../modules/ventas/caja-session.util';
import type { CajaApertura } from '../entities/CajaApertura.entity';

describe('isIntegrationCajaSession', () => {
  it('detects INTEG-* and INTEG-PLAN-* names', () => {
    expect(isIntegrationCajaSession('INTEG-1778613463742')).toBe(true);
    expect(isIntegrationCajaSession('INTEG-PLAN-123-0')).toBe(true);
    expect(isIntegrationCajaSession('Caja Principal')).toBe(false);
  });
});

describe('serializeCajaFecha', () => {
  it('returns ISO string for valid dates', () => {
    const iso = serializeCajaFecha(new Date('2026-05-12T14:30:00.000Z'));
    expect(iso).toBe('2026-05-12T14:30:00.000Z');
  });
});

describe('mapCajaAperturaHistorial', () => {
  it('flags inconsistent close before open', () => {
    const row = mapCajaAperturaHistorial({
      id: 1,
      cajaNombre: 'Caja 1',
      montoApertura: 1000,
      montoCierre: 1000,
      fechaApertura: new Date('2026-05-12T18:00:00.000Z'),
      fechaCierre: new Date('2026-05-12T08:00:00.000Z'),
      abierta: false,
    } as CajaApertura);

    expect(row.datosInconsistentes).toBe(true);
    expect(row.fechaApertura).toBe('2026-05-12T18:00:00.000Z');
    expect(row.fechaCierre).toBe('2026-05-12T08:00:00.000Z');
  });
});
