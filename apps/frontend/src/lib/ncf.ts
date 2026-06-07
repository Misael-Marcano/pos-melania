/** Paridad con `apps/backend/src/utils/ncf.ts` (solo helpers puros). */

export function parseNcfSequenceTail(secuenciaOrNcf: string): number {
  return parseInt(secuenciaOrNcf.slice(-8), 10);
}

export function buildNcfPreview(series: string, tipo: string, sequence: number): string {
  return `${series}${tipo.padStart(2, '0')}${String(sequence).padStart(8, '0')}`;
}

/** Extrae el tipo (2 dígitos) de un NCF completo, p. ej. B0200012501 → 02. */
export function parseNcfTipo(ncf: string): string | null {
  const m = ncf.trim().toUpperCase().match(/^[A-Z](\d{2})\d{8}$/);
  return m?.[1] ?? null;
}

export function ncfProgressPct(secuenciaActual: string, desde: string, hasta: string): number {
  const a = parseNcfSequenceTail(secuenciaActual);
  const d = parseNcfSequenceTail(desde);
  const h = parseNcfSequenceTail(hasta);
  if (Number.isNaN(a) || Number.isNaN(d) || Number.isNaN(h) || h <= d) return 0;
  return Math.min(100, Math.max(0, ((a - d) / (h - d)) * 100));
}

export function ncfSequenceExhausted(secuenciaActual: string, hasta: string): boolean {
  return parseNcfSequenceTail(secuenciaActual) > parseNcfSequenceTail(hasta);
}
