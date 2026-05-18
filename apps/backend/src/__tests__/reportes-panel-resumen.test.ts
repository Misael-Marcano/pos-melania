import { normalizeReporteDia, stepIsoDate } from '../modules/reportes/reportes-query';

describe('reportes panel helpers', () => {
  it('normalizeReporteDia acepta ISO de SQL Server', () => {
    expect(normalizeReporteDia('2026-05-18T00:00:00.000Z')).toBe('2026-05-18');
    expect(normalizeReporteDia('2026-05-18')).toBe('2026-05-18');
  });

  it('stepIsoDate desplaza días en calendario', () => {
    expect(stepIsoDate('2026-05-18', -1)).toBe('2026-05-17');
  });
});
