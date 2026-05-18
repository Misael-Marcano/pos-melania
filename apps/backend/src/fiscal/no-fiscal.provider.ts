import { EntityManager } from 'typeorm';
import { TipoComprobante } from '@pos/shared';
import { AppError } from '../middlewares/error.middleware';
import { FiscalProvider } from './fiscal-provider.types';
import {
  splitTotalConItbisIncluido,
  type FiscalTaxContext,
  type FiscalTaxSplit,
} from './fiscal-itbis';

/** Instancias sin comprobante fiscal formal (retail fuera de RD o solo ticket interno). */
export class NoFiscalProvider implements FiscalProvider {
  readonly id = 'none' as const;

  async nextComprobanteFiscal(_tipo: TipoComprobante, _manager: EntityManager, _tenantId: number): Promise<string> {
    throw new AppError(
      'Comprobantes fiscales (NCF) no están habilitados en esta instancia. Configure FISCAL_JURISDICTION=DO o desactive usarNCF en la venta.',
      400,
    );
  }

  splitItbisIncluido(total: number, ctx?: FiscalTaxContext): FiscalTaxSplit {
    const tasa =
      ctx?.tasaImpuestoPct != null && Number(ctx.tasaImpuestoPct) > 0
        ? Number(ctx.tasaImpuestoPct)
        : 0;
    return splitTotalConItbisIncluido(total, tasa);
  }
}
