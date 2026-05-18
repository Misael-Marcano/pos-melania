import {
  configCompletenessItems,
  configCompletenessPercent,
  formatRncHint,
  isValidItbisRate,
  type ConfigFormCompletenessInput,
  type FiscalJurisdiccionConfig,
  type IConfiguracion,
} from '@pos/shared';

export type ConfigFormState = {
  nombreCompania: string;
  rnc: string;
  direccion: string;
  telefono: string;
  sitioWeb: string;
  logotipoUrl: string;
  textoPieRecibo: string;
  simboloMoneda: string;
  numeroDecimales: number;
  tasaImpuesto1Nombre: string;
  tasaImpuesto1: number;
  tasaImpuesto2Nombre: string;
  tasaImpuesto2: number;
  preciosIncluyenImpuesto: boolean;
  comprobanteDefecto: string;
  fiscalJurisdiccion: '' | FiscalJurisdiccionConfig;
  nombreCaja: string;
  tiendaId: number | '';
  cajaId: number | '';
};

export const EMPTY_CONFIG_FORM: ConfigFormState = {
  nombreCompania: '',
  rnc: '',
  direccion: '',
  telefono: '',
  sitioWeb: '',
  logotipoUrl: '',
  textoPieRecibo: '',
  simboloMoneda: 'RDS',
  numeroDecimales: 2,
  tasaImpuesto1Nombre: 'ITBIS',
  tasaImpuesto1: 18,
  tasaImpuesto2Nombre: '',
  tasaImpuesto2: 0,
  preciosIncluyenImpuesto: true,
  comprobanteDefecto: '02',
  fiscalJurisdiccion: '',
  nombreCaja: 'CAJA 1',
  tiendaId: '',
  cajaId: '',
};

export function mapConfigToForm(cfg: IConfiguracion): ConfigFormState {
  return {
    nombreCompania: cfg.nombreCompania ?? '',
    rnc: cfg.rnc ?? '',
    direccion: cfg.direccion ?? '',
    telefono: cfg.telefono ?? '',
    sitioWeb: cfg.sitioWeb ?? '',
    logotipoUrl: cfg.logotipoUrl ?? '',
    textoPieRecibo: cfg.textoPieRecibo ?? '',
    simboloMoneda: cfg.simboloMoneda ?? 'RDS',
    numeroDecimales: cfg.numeroDecimales ?? 2,
    tasaImpuesto1Nombre: cfg.tasaImpuesto1Nombre ?? 'ITBIS',
    tasaImpuesto1: Number(cfg.tasaImpuesto1) || 0,
    tasaImpuesto2Nombre: cfg.tasaImpuesto2Nombre ?? '',
    tasaImpuesto2: Number(cfg.tasaImpuesto2) || 0,
    preciosIncluyenImpuesto: cfg.preciosIncluyenImpuesto ?? true,
    comprobanteDefecto: cfg.comprobanteDefecto ?? '02',
    fiscalJurisdiccion:
      cfg.fiscalJurisdiccion === 'DO' || cfg.fiscalJurisdiccion === 'NONE'
        ? cfg.fiscalJurisdiccion
        : '',
    nombreCaja: cfg.nombreCaja ?? 'CAJA 1',
    tiendaId: cfg.tiendaId != null ? cfg.tiendaId : '',
    cajaId: cfg.cajaId != null ? cfg.cajaId : '',
  };
}

export function formToPayload(form: ConfigFormState): Partial<IConfiguracion> {
  const empty = (s: string) => {
    const t = s.trim();
    return t === '' ? undefined : t;
  };
  return {
    ...form,
    tiendaId: form.tiendaId === '' ? null : form.tiendaId,
    cajaId: form.cajaId === '' ? null : form.cajaId,
    textoPieRecibo: empty(form.textoPieRecibo) ?? null,
    fiscalJurisdiccion:
      form.fiscalJurisdiccion === '' ? null : form.fiscalJurisdiccion,
    sitioWeb: empty(form.sitioWeb),
    logotipoUrl: empty(form.logotipoUrl),
    rnc: empty(form.rnc),
    direccion: empty(form.direccion),
    telefono: empty(form.telefono),
  };
}

export function validateConfigForm(form: ConfigFormState): string | null {
  if (!form.nombreCompania.trim()) {
    return 'El nombre de la empresa es obligatorio.';
  }
  const rncErr = formatRncHint(form.rnc);
  if (rncErr) return rncErr;
  if (!isValidItbisRate(form.tasaImpuesto1)) {
    return 'La tasa ITBIS debe estar entre 0 y 100.';
  }
  if (!isValidItbisRate(form.tasaImpuesto2)) {
    return 'La tasa del impuesto 2 debe estar entre 0 y 100.';
  }
  const web = form.sitioWeb.trim();
  if (web && !/^https?:\/\//i.test(web)) {
    return 'El sitio web debe comenzar con http:// o https://';
  }
  const logo = form.logotipoUrl.trim();
  if (logo && !/^https?:\/\//i.test(logo)) {
    return 'La URL del logotipo debe comenzar con http:// o https://';
  }
  return null;
}

export function completenessForForm(form: ConfigFormState) {
  const input: ConfigFormCompletenessInput = form;
  const items = configCompletenessItems(input);
  return { items, percent: configCompletenessPercent(items) };
}

export function formsEqual(a: ConfigFormState, b: ConfigFormState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
