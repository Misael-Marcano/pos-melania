/** Tasa ITBIS estándar RD (DGII) cuando el tenant no define `tasaImpuesto1`. */
export const ITBIS_RD_DEFAULT_PCT = 18;

export type FiscalTaxSplit = {
  baseImponible: number;
  itbis: number;
  total: number;
};

export type FiscalTaxContext = {
  /** Tasa del tenant en % (p. ej. `configuracion.tasaImpuesto1`). */
  tasaImpuestoPct?: number | null;
};

/** Divide un monto con impuesto incluido en base imponible + ITBIS. */
export function splitTotalConItbisIncluido(total: number, tasaPct: number): FiscalTaxSplit {
  const t = Number(total);
  if (!Number.isFinite(t) || t <= 0) {
    return { baseImponible: 0, itbis: 0, total: 0 };
  }
  if (tasaPct <= 0) {
    const base = Number(t.toFixed(2));
    return { baseImponible: base, itbis: 0, total: base };
  }
  const factor = 1 + tasaPct / 100;
  const baseImponible = Number((t / factor).toFixed(2));
  const itbis = Number((t - baseImponible).toFixed(2));
  return { baseImponible, itbis, total: Number(t.toFixed(2)) };
}

export function effectiveItbisRatePct(
  providerDefaultPct: number,
  ctx?: FiscalTaxContext,
): number {
  const fromCtx = ctx?.tasaImpuestoPct;
  if (fromCtx != null && Number(fromCtx) > 0) return Number(fromCtx);
  return providerDefaultPct;
}
