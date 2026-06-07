/** Paridad con `apps/backend/src/utils/ncf.ts` (solo helpers puros). */

export const TIPO_NCF_LABEL: Record<string, string> = {
  '01': 'Factura de crédito fiscal',
  '02': 'Factura de consumo',
  '03': 'Nota de débito',
  '04': 'Nota de crédito',
  '11': 'Comprobante de compras',
  '12': 'Registro único de ingresos',
  '13': 'Gastos menores',
  '14': 'Régimen especial',
  '15': 'Gubernamental',
  '16': 'Exportaciones',
  '17': 'Pagos al exterior',
};

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

/** B02 (consumo) no exige cliente en caja; otros tipos fiscales sí. */
export function ncfRequiereCliente(tipo: string | null | undefined): boolean {
  return tipo != null && tipo !== '02';
}

/** Jurisdicción fiscal activa (DO/DGII). NONE/MOCK/OFF desactivan NCF. */
export function isFiscalJurisdictionActiva(fiscalJurisdiccion?: string | null): boolean {
  const j = (fiscalJurisdiccion ?? '').trim().toUpperCase();
  if (!j) return true;
  return j !== 'NONE' && j !== 'OFF' && j !== 'MOCK';
}

/** Título del recibo según serie fiscal registrada (descripción DGII) o ticket interno. */
export function resolveComprobanteTitulo(
  ncf: string | null | undefined,
  comprobantes: ReadonlyArray<{ tipo: string; descripcion: string; activo?: boolean }>,
  fallbackSinNcf = 'Comprobante de venta',
): string {
  if (!ncf?.trim()) return fallbackSinNcf;

  const tipo = parseNcfTipo(ncf);
  const match = tipo
    ? comprobantes.find((c) => c.tipo === tipo && c.activo !== false)
    : undefined;

  if (match?.descripcion?.trim()) return match.descripcion.trim();
  if (tipo && TIPO_NCF_LABEL[tipo]) return TIPO_NCF_LABEL[tipo];
  return 'Comprobante fiscal (NCF)';
}
