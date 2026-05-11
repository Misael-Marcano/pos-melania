import { EntityManager } from 'typeorm';
import { TipoComprobante } from '@pos/shared';
import { generarNCF } from '../utils/ncf';
import { FiscalProvider } from './fiscal-provider.types';

/** DGII — secuencias NCF en tabla `comprobantes` (formato clásico RD). */
export class DgiiRdFiscalProvider implements FiscalProvider {
  readonly id = 'dgii_rd' as const;

  async nextComprobanteFiscal(tipo: TipoComprobante, manager: EntityManager, tenantId: number): Promise<string> {
    return generarNCF(tipo, manager, tenantId);
  }
}
