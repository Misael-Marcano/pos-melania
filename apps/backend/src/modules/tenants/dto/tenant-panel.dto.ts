import { z } from 'zod';

const tenantPanelUsageSchema = z.object({
  seats:            z.number().int().nonnegative(),
  tiendasActivas:   z.number().int().nonnegative(),
  articulosActivos: z.number().int().nonnegative(),
  ventasMesActual:  z.number().int().nonnegative(),
});

const tenantPanelLimitsSchema = z.object({
  maxUsers:     z.number().int().positive().nullable(),
  maxTiendas:   z.number().int().positive().nullable(),
  maxArticulos: z.number().int().positive().nullable(),
});

export const tenantPanelRowSchema = z.object({
  id:                   z.number().int().positive(),
  nombre:               z.string().min(1),
  slug:                 z.string().min(1),
  activo:               z.boolean(),
  planCode:             z.string().min(1),
  planLabel:            z.string().min(1),
  billingStatus:        z.string().nullable(),
  stripeCustomerId:     z.string().nullable(),
  stripeSubscriptionId: z.string().nullable(),
  trialEndsAt:          z.coerce.date().nullable().optional(),
  usage:                tenantPanelUsageSchema,
  limits:               tenantPanelLimitsSchema,
  createdAt:            z.coerce.date(),
});

export const tenantPanelListSchema = z.array(tenantPanelRowSchema);

export type TenantPanelRowDto = z.infer<typeof tenantPanelRowSchema>;

/** Valida la respuesta del panel antes de enviarla (contrato estable para OpenAPI/cliente). */
export function parseTenantPanelList(rows: unknown[]): TenantPanelRowDto[] {
  return tenantPanelListSchema.parse(rows);
}
