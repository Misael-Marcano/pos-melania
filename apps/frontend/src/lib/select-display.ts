/**
 * Human-readable labels for native <select> options.
 * Normalizes database or enum strings that arrive in ALL CAPS.
 */

const LETTER_RE = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/;

function isAllCapsWords(s: string): boolean {
  const letters = s.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, '');
  if (letters.length < 2) return false;
  return LETTER_RE.test(letters) && letters === letters.toUpperCase();
}

/** Sentence-style casing when the whole fragment is shouting ALL CAPS; otherwise trim only. */
export function normalizeSelectLabel(raw: string | null | undefined): string {
  if (raw == null) return '';
  const t = raw.trim();
  if (!t) return '';
  if (!isAllCapsWords(t)) return t;
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

/** "TIENDA — CAJA 1" → "Tienda — Caja 1" without touching mixed-case names. */
export function formatTiendaCajaLine(
  tiendaNombre: string | null | undefined,
  cajaNombre: string | null | undefined
): string {
  const tienda = normalizeSelectLabel(tiendaNombre ?? '');
  const caja = normalizeSelectLabel(cajaNombre ?? '');
  if (!tienda && !caja) return '';
  if (!tienda) return caja;
  if (!caja) return tienda;
  /* Thin spaces around the dash keep the line readable and avoid awkward wraps. */
  return `${tienda}\u2009—\u2009${caja}`;
}
