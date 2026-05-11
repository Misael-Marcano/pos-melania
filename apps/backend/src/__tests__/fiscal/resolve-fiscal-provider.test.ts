import { resolveFiscalProvider } from '../../fiscal/resolve-fiscal-provider';

describe('resolveFiscalProvider', () => {
  const orig = process.env.FISCAL_JURISDICTION;

  afterEach(() => {
    if (orig === undefined) delete process.env.FISCAL_JURISDICTION;
    else process.env.FISCAL_JURISDICTION = orig;
  });

  it('defaults to DGII provider', () => {
    delete process.env.FISCAL_JURISDICTION;
    expect(resolveFiscalProvider().id).toBe('dgii_rd');
  });

  it('accepts DO', () => {
    process.env.FISCAL_JURISDICTION = 'DO';
    expect(resolveFiscalProvider().id).toBe('dgii_rd');
  });

  it('NONE yields no-fiscal provider', () => {
    process.env.FISCAL_JURISDICTION = 'NONE';
    expect(resolveFiscalProvider().id).toBe('none');
  });

  it('MOCK aliases to no-fiscal provider', () => {
    process.env.FISCAL_JURISDICTION = 'MOCK';
    expect(resolveFiscalProvider().id).toBe('none');
  });

  it('throws for unknown jurisdiction', () => {
    process.env.FISCAL_JURISDICTION = 'XX';
    expect(() => resolveFiscalProvider()).toThrow();
  });

  it('prefers configuracion over env when set', () => {
    process.env.FISCAL_JURISDICTION = 'NONE';
    expect(resolveFiscalProvider('DO').id).toBe('dgii_rd');
  });

  it('prefers NONE from configuracion over DO env', () => {
    process.env.FISCAL_JURISDICTION = 'DO';
    expect(resolveFiscalProvider('NONE').id).toBe('none');
  });
});
