import type { DataSource } from 'typeorm';
import { DEFAULT_REPORTES_TZ, isValidReportesTimezone } from '@pos/shared';

export { DEFAULT_REPORTES_TZ };

const IANA_TO_SQL_SERVER: Record<string, string> = {
  'America/Santo_Domingo': 'Eastern Standard Time',
  'America/New_York': 'Eastern Standard Time',
  'America/Puerto_Rico': 'Atlantic Standard Time',
  'America/Bogota': 'SA Pacific Standard Time',
  'America/Mexico_City': 'Central Standard Time (Mexico)',
  'America/Chicago': 'Central Standard Time',
  UTC: 'UTC',
};

/** Resuelve zona IANA: configuración del tenant → `REPORTES_TIMEZONE` → default RD. */
export function resolveReportesTimezone(configZona?: string | null): string {
  const fromConfig = configZona?.trim();
  if (fromConfig && isValidReportesTimezone(fromConfig) && IANA_TO_SQL_SERVER[fromConfig]) {
    return fromConfig;
  }
  const env = process.env.REPORTES_TIMEZONE?.trim();
  if (env && isValidReportesTimezone(env) && IANA_TO_SQL_SERVER[env]) {
    return env;
  }
  return DEFAULT_REPORTES_TZ;
}

/** @deprecated Preferir `resolveReportesTimezone` con valor de BD por tenant. */
export function reportesTimezone(): string {
  return resolveReportesTimezone(null);
}

export async function fetchTenantReportesTimezone(
  ds: DataSource,
  tenantId: number,
): Promise<string> {
  const [row] = await ds
    .query(`SELECT TOP 1 zonaHoraria FROM configuracion WHERE tenantId = @0`, [tenantId])
    .catch(() => [{}]);
  return resolveReportesTimezone(row?.zonaHoraria);
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
