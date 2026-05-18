/** Zona horaria IANA para agregaciones diarias en reportes (override: `REPORTES_TIMEZONE`). */
export const DEFAULT_REPORTES_TZ = 'America/Santo_Domingo';

const IANA_TO_SQL_SERVER: Record<string, string> = {
  'America/Santo_Domingo': 'Eastern Standard Time',
  UTC: 'UTC',
};

export function reportesTimezone(): string {
  const raw = process.env.REPORTES_TIMEZONE?.trim();
  return raw && raw.length > 0 ? raw : DEFAULT_REPORTES_TZ;
}

/** Convierte columna datetime a fecha calendario en la zona del negocio (SQL Server). */
export function sqlFechaDia(column: string, tz = reportesTimezone()): string {
  const sqlTz = IANA_TO_SQL_SERVER[tz];
  if (!sqlTz) {
    throw new Error(`Zona horaria no soportada en reportes: ${tz}`);
  }
  // AT TIME ZONE exige datetime2/datetime/datetimeoffset; gastos.fecha es DATE.
  return `CAST((CAST(${column} AS datetime2) AT TIME ZONE '${sqlTz}') AS DATE)`;
}
