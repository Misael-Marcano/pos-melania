import { AppDataSource } from '../config/database';
import { Configuracion } from '../entities/Configuracion.entity';
import { Tenant } from '../entities/Tenant.entity';

export interface TenantEmailBranding {
  /** Nombre visible en asuntos y cuerpo (configuración de empresa o tenant). */
  displayName: string;
  /** Línea opcional de contacto (teléfono / web) para el pie del correo. */
  contactLine?: string;
}

/**
 * Datos de marca del tenant para emails de trial/facturación.
 * Prioriza `configuracion.nombreCompania` sobre `tenants.nombre`.
 */
export async function resolveTenantEmailBranding(
  tenantId: number,
): Promise<TenantEmailBranding> {
  const tenantRepo = AppDataSource.getRepository(Tenant);
  const cfgRepo = AppDataSource.getRepository(Configuracion);

  const [tenant, cfg] = await Promise.all([
    tenantRepo.findOne({ where: { id: tenantId }, select: ['nombre'] }),
    cfgRepo.findOne({
      where: { tenant: { id: tenantId } },
      select: ['nombreCompania', 'telefono', 'sitioWeb'],
    }),
  ]);

  const company = cfg?.nombreCompania?.trim();
  const displayName = company || tenant?.nombre?.trim() || 'Tu organización';

  const parts: string[] = [];
  const tel = cfg?.telefono?.trim();
  const web = cfg?.sitioWeb?.trim();
  if (tel) parts.push(`Tel: ${tel}`);
  if (web) parts.push(web);

  return {
    displayName,
    contactLine: parts.length ? parts.join(' · ') : undefined,
  };
}
