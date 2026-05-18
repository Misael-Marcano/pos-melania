import {
  DEFAULT_REPORTES_TZ,
  resolveReportesTimezone,
} from '../../modules/reportes/reportes-timezone';

describe('resolveReportesTimezone', () => {
  const prev = process.env.REPORTES_TIMEZONE;

  afterEach(() => {
    if (prev === undefined) delete process.env.REPORTES_TIMEZONE;
    else process.env.REPORTES_TIMEZONE = prev;
  });

  it('usa zona de configuración cuando es válida', () => {
    expect(resolveReportesTimezone('America/Bogota')).toBe('America/Bogota');
  });

  it('cae a REPORTES_TIMEZONE del entorno si no hay config', () => {
    process.env.REPORTES_TIMEZONE = 'UTC';
    expect(resolveReportesTimezone(null)).toBe('UTC');
  });

  it('usa default RD si config y env son inválidos', () => {
    process.env.REPORTES_TIMEZONE = 'Invalid/Zone';
    expect(resolveReportesTimezone('Europe/Madrid')).toBe(DEFAULT_REPORTES_TZ);
  });
});
