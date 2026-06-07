import { describe, expect, it } from 'vitest';
import { isFiscalJurisdictionActiva, ncfRequiereCliente } from './ncf';

describe('ncfRequiereCliente', () => {
  it('B02 consumo no requiere cliente', () => {
    expect(ncfRequiereCliente('02')).toBe(false);
  });

  it('B01 y otros sí requieren cliente', () => {
    expect(ncfRequiereCliente('01')).toBe(true);
    expect(ncfRequiereCliente('04')).toBe(true);
  });
});

describe('isFiscalJurisdictionActiva', () => {
  it('vacío o DO activan fiscal', () => {
    expect(isFiscalJurisdictionActiva()).toBe(true);
    expect(isFiscalJurisdictionActiva('DO')).toBe(true);
  });

  it('NONE desactiva fiscal', () => {
    expect(isFiscalJurisdictionActiva('NONE')).toBe(false);
  });
});
