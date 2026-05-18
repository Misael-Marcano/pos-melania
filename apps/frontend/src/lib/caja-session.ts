/** Sesiones de pruebas de integración — ocultas por defecto en historial. */
const INTEGRATION_CAJA_RE = /^INTEG/i;

export function isIntegrationCajaSession(cajaNombre: string): boolean {
  return INTEGRATION_CAJA_RE.test(cajaNombre.trim());
}

export function formatCajaDateTime(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-DO', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

export type SessionDurationResult =
  | { kind: 'ok'; label: string }
  | { kind: 'open' }
  | { kind: 'invalid' }
  | { kind: 'inconsistent' };

/** Duración entre apertura y cierre; minutos normalizados (evita `-60m`). */
export function formatSessionDuration(
  apertura: string,
  cierre?: string | null,
): SessionDurationResult {
  if (!cierre) return { kind: 'open' };
  const start = new Date(apertura).getTime();
  const end   = new Date(cierre).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return { kind: 'invalid' };
  if (end < start) return { kind: 'inconsistent' };

  const totalMinutes = Math.floor((end - start) / 60_000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h === 0 && m === 0) return { kind: 'ok', label: '< 1m' };
  if (h === 0) return { kind: 'ok', label: `${m}m` };
  if (m === 0) return { kind: 'ok', label: `${h}h` };
  return { kind: 'ok', label: `${h}h ${m}m` };
}
