import {
  ITBIS_RD_DEFAULT_PCT,
  splitTotalConItbisIncluido,
  effectiveItbisRatePct,
} from '../../fiscal/fiscal-itbis';

describe('splitTotalConItbisIncluido', () => {
  it('splits 18% ITBIS included (legacy 1.18 behavior)', () => {
    const r = splitTotalConItbisIncluido(118, ITBIS_RD_DEFAULT_PCT);
    expect(r.baseImponible).toBe(100);
    expect(r.itbis).toBe(18);
    expect(r.total).toBe(118);
  });

  it('returns zero tax when rate is 0', () => {
    const r = splitTotalConItbisIncluido(500, 0);
    expect(r.baseImponible).toBe(500);
    expect(r.itbis).toBe(0);
  });

  it('handles zero total', () => {
    const r = splitTotalConItbisIncluido(0, 18);
    expect(r).toEqual({ baseImponible: 0, itbis: 0, total: 0 });
  });
});

describe('effectiveItbisRatePct', () => {
  it('prefers tenant rate over provider default', () => {
    expect(effectiveItbisRatePct(ITBIS_RD_DEFAULT_PCT, { tasaImpuestoPct: 10 })).toBe(10);
  });

  it('falls back to provider default when tenant rate missing', () => {
    expect(effectiveItbisRatePct(ITBIS_RD_DEFAULT_PCT, {})).toBe(18);
  });
});
