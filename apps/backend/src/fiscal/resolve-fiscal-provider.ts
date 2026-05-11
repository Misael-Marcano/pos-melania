import { DgiiRdFiscalProvider } from './dgii-rd.provider';
import { NoFiscalProvider } from './no-fiscal.provider';
import { FiscalProvider } from './fiscal-provider.types';
import { AppError } from '../middlewares/error.middleware';

function normalizeCode(raw: string | null | undefined): string {
  const t = (raw ?? '').trim().toUpperCase();
  return t === '' ? 'DO' : t;
}

/**
 * Selecciona el proveedor fiscal.
 * - Si `fiscalJurisdiccionDesdeConfig` tiene valor (p. ej. columna `configuracion.fiscalJurisdiccion`), tiene prioridad sobre el `.env`.
 * - Si no hay valor en BD, se usa `FISCAL_JURISDICTION`; por defecto `DO` = DGII (NCF).
 */
export function resolveFiscalProvider(fiscalJurisdiccionDesdeConfig?: string | null): FiscalProvider {
  const fromDb = fiscalJurisdiccionDesdeConfig;
  const effective =
    fromDb != null && String(fromDb).trim() !== ''
      ? normalizeCode(fromDb)
      : normalizeCode(process.env.FISCAL_JURISDICTION);

  if (effective === 'DO' || effective === 'RD' || effective === 'DGII' || effective === 'DGII_RD') {
    return new DgiiRdFiscalProvider();
  }
  if (effective === 'NONE' || effective === 'OFF' || effective === 'MOCK') {
    return new NoFiscalProvider();
  }

  throw new AppError(
    `Jurisdicción fiscal «${effective}» no tiene proveedor registrado. Use DO (DGII/RD), NONE/MOCK, o implemente un FiscalProvider.`,
    501,
  );
}
