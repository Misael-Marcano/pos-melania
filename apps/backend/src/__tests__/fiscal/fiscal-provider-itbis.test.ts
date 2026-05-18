import { DgiiRdFiscalProvider } from '../../fiscal/dgii-rd.provider';
import { NoFiscalProvider } from '../../fiscal/no-fiscal.provider';

describe('FiscalProvider.splitItbisIncluido', () => {
  it('DgiiRd uses 18% by default', () => {
    const p = new DgiiRdFiscalProvider();
    const r = p.splitItbisIncluido(1180);
    expect(r.baseImponible).toBe(1000);
    expect(r.itbis).toBe(180);
  });

  it('DgiiRd respects tenant tasaImpuesto1', () => {
    const p = new DgiiRdFiscalProvider();
    const r = p.splitItbisIncluido(110, { tasaImpuestoPct: 10 });
    expect(r.baseImponible).toBe(100);
    expect(r.itbis).toBe(10);
  });

  it('NoFiscal uses tenant rate only', () => {
    const p = new NoFiscalProvider();
    expect(p.splitItbisIncluido(118).itbis).toBe(0);
    const r = p.splitItbisIncluido(110, { tasaImpuestoPct: 10 });
    expect(r.itbis).toBe(10);
  });
});
