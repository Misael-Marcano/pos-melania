import { EntityManager } from 'typeorm';
import { TipoComprobante } from '@pos/shared';
import type { FiscalTaxContext, FiscalTaxSplit } from './fiscal-itbis';

export type { FiscalTaxContext, FiscalTaxSplit } from './fiscal-itbis';

/** Punto de extensión para reglas fiscales por jurisdicción (Fase C — POS genérico). Implementación RD: `DgiiRdFiscalProvider`. */
export interface FiscalProvider {
  readonly id: string;

  /** Emite el siguiente número de comprobante fiscal (p. ej. NCF) dentro de la transacción activa. */
  nextComprobanteFiscal(tipo: TipoComprobante, manager: EntityManager, tenantId: number): Promise<string>;

  /** Divide un total con ITBIS incluido (reportes DGII, vistas previa). */
  splitItbisIncluido(total: number, ctx?: FiscalTaxContext): FiscalTaxSplit;
}
