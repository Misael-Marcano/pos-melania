/** Utilidades de validación compartidas (backend Zod + frontend). */

export const COMPROBANTE_DEFECTO_VALUES = ['01', '02', '04', '14', '15'] as const;
export type ComprobanteDefecto = (typeof COMPROBANTE_DEFECTO_VALUES)[number];

export const FISCAL_JURISDICTION_VALUES = ['DO', 'NONE'] as const;
export type FiscalJurisdiccionConfig = (typeof FISCAL_JURISDICTION_VALUES)[number];

export const ITBIS_RD_SUGGESTED_PCT = 18;
export const ITBIS_RATE_MIN = 0;
export const ITBIS_RATE_MAX = 100;

/** Solo dígitos del RNC/cédula tributaria RD (9 o 11 dígitos). */
export function normalizeRnc(value: string | null | undefined): string {
  return String(value ?? '').replace(/\D/g, '');
}

export function isValidRnc(value: string | null | undefined): boolean {
  const digits = normalizeRnc(value);
  if (digits.length === 0) return true;
  return digits.length === 9 || digits.length === 11;
}

export function formatRncHint(value: string | null | undefined): string | null {
  const digits = normalizeRnc(value);
  if (digits.length === 0) return null;
  if (isValidRnc(digits)) return null;
  return 'El RNC debe tener 9 u 11 dígitos (solo números).';
}

export function isValidItbisRate(value: number): boolean {
  if (!Number.isFinite(value)) return false;
  if (value < ITBIS_RATE_MIN || value > ITBIS_RATE_MAX) return false;
  return Math.round(value * 100) === value * 100;
}

export type ConfigCompletenessItem = {
  id: string;
  label: string;
  ok: boolean;
  tab: 'empresa' | 'fiscal' | 'pos';
};

export type ConfigFormCompletenessInput = {
  nombreCompania: string;
  rnc: string;
  direccion: string;
  telefono: string;
  tasaImpuesto1: number;
  fiscalJurisdiccion: '' | FiscalJurisdiccionConfig;
  comprobanteDefecto: string;
  tiendaId: number | '';
  cajaId: number | '';
};

export function configCompletenessItems(
  form: ConfigFormCompletenessInput,
): ConfigCompletenessItem[] {
  const fiscalActive =
    form.fiscalJurisdiccion === 'DO' || form.fiscalJurisdiccion === '';
  return [
    {
      id: 'nombre',
      label: 'Nombre de la empresa',
      ok: form.nombreCompania.trim().length > 0,
      tab: 'empresa',
    },
    {
      id: 'rnc',
      label: 'RNC válido (DGII)',
      ok: !fiscalActive || isValidRnc(form.rnc),
      tab: 'empresa',
    },
    {
      id: 'direccion',
      label: 'Dirección registrada',
      ok: form.direccion.trim().length > 0,
      tab: 'empresa',
    },
    {
      id: 'itbis',
      label: 'Tasa ITBIS configurada',
      ok: !fiscalActive || (form.tasaImpuesto1 > 0 && isValidItbisRate(form.tasaImpuesto1)),
      tab: 'fiscal',
    },
    {
      id: 'comprobante',
      label: 'Tipo de comprobante por defecto',
      ok: COMPROBANTE_DEFECTO_VALUES.includes(form.comprobanteDefecto as ComprobanteDefecto),
      tab: 'fiscal',
    },
    {
      id: 'tienda',
      label: 'Sucursal de ventas',
      ok: form.tiendaId !== '',
      tab: 'pos',
    },
  ];
}

export function configCompletenessPercent(items: ConfigCompletenessItem[]): number {
  if (items.length === 0) return 100;
  const ok = items.filter((i) => i.ok).length;
  return Math.round((ok / items.length) * 100);
}
