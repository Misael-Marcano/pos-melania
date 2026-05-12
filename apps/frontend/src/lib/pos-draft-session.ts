import type { ICliente } from '@pos/shared';
import { z } from 'zod';

/**
 * Borrador de venta POS en `sessionStorage`: sobrevive a F5 en la misma pestaña;
 * el navegador lo borra al cerrar la pestaña (no usar `localStorage` por alcance).
 */
export const POS_DRAFT_SCHEMA_VERSION = 1 as const;

const zMetodoPago = z.enum([
  'EFECTIVO',
  'TARJETA',
  'TRANSFERENCIA',
  'CREDITO',
  'TARJETA_REGALO',
]);

const zTipoNcf = z.enum(['01', '02', '04', '14', '15']);

const zCategoria = z.object({
  id: z.number(),
  nombre: z.string(),
});

const zArticulo = z.object({
  id: z.number(),
  codigoBarras: z.string(),
  nombre: z.string(),
  costo: z.number(),
  precioVenta: z.number(),
  cantidad: z.union([z.number(), z.null()]),
  tamanio: z.string().optional(),
  unidadMedida: z.union([z.string(), z.null()]).optional(),
  categoria: zCategoria,
  activo: z.boolean(),
});

const zCartItem = z.object({
  articulo: zArticulo,
  cantidad: z.number(),
  precioUnitario: z.number(),
  descuento: z.number(),
  total: z.number(),
});

const zPagoLine = z.object({
  metodo: zMetodoPago,
  monto: z.number(),
});

/** Sin códigos de tarjeta regalo ni datos de tarjeta bancaria — solo estado de cobro. */
const zClienteLite = z.object({
  id: z.number(),
  nombre: z.string(),
  limiteCredito: z.number().optional(),
  saldo: z.number().optional(),
  descuentoCliente: z.number().nullable().optional(),
});

export const posDraftV1Schema = z.object({
  v: z.literal(POS_DRAFT_SCHEMA_VERSION),
  items: z.array(zCartItem),
  clienteId: z.number().nullable(),
  descuentoGlobal: z.number(),
  clienteNombre: z.string(),
  clienteLite: zClienteLite.nullable().optional(),
  selectedCajaId: z.number().optional(),
  mode: z.enum(['cart', 'payment']),
  pagos: z.array(zPagoLine),
  usarNCF: z.boolean(),
  tipoNCF: zTipoNcf,
  notas: z.string(),
  promoCodigo: z.string(),
  promoDescuento: z.number(),
  promoNombre: z.string(),
  showNCF: z.boolean(),
  pagoMixto: z.boolean(),
  metodoPago: zMetodoPago,
  efectivoRecibido: z.union([z.number(), z.literal('')]),
  esDelivery: z.boolean(),
  deliveryCargo: z.union([z.number(), z.literal('')]),
  deliveryDireccion: z.string(),
});

export type PosDraftV1 = z.infer<typeof posDraftV1Schema>;

export function buildPosDraftStorageKey(tenantId: number, tiendaId: number): string {
  return `pos_venta_draft:v${POS_DRAFT_SCHEMA_VERSION}:${tenantId}:${tiendaId}`;
}

export function parsePosDraftV1(raw: string): PosDraftV1 | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  const r = posDraftV1Schema.safeParse(parsed);
  if (!r.success) return null;
  if (r.data.items.length === 0) return null;
  return r.data;
}

export function removePosDraftStorage(tenantId: number, tiendaId: number): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(buildPosDraftStorageKey(tenantId, tiendaId));
  } catch {
    /* ignore */
  }
}

/** Reconstruye `ICliente` mínimo para el POS a partir del borrador (sin PII extra). */
export function rehydrateClienteFromDraftLite(lite: NonNullable<PosDraftV1['clienteLite']>): ICliente {
  return {
    id: lite.id,
    nombre: lite.nombre,
    saldo: Number(lite.saldo ?? 0),
    limiteCredito: Number(lite.limiteCredito ?? 0),
    descuentoCliente: Number(lite.descuentoCliente ?? 0),
    activo: true,
    createdAt: '',
  };
}
