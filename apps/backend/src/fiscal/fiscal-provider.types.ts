import { EntityManager } from 'typeorm';
import { TipoComprobante } from '@pos/shared';

/** Punto de extensión para reglas fiscales por jurisdicción (Fase C — POS genérico). Implementación RD: `DgiiRdFiscalProvider`. */
export interface FiscalProvider {
  readonly id: string;

  /** Emite el siguiente número de comprobante fiscal (p. ej. NCF) dentro de la transacción activa. */
  nextComprobanteFiscal(tipo: TipoComprobante, manager: EntityManager, tenantId: number): Promise<string>;
}
