import { z } from 'zod';

export const CAJA_DENOMINACIONES = ['2000','1000','500','200','100','50','25','10','5','1'] as const;
const CAJA_DENOMINACIONES_SET = new Set<string>(CAJA_DENOMINACIONES);
const MAX_CAJA_AMOUNT = 10_000_000;
const MAX_DENOMINATION_COUNT = 100_000;

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

const currencySchema = z
  .number({ invalid_type_error: 'Debe ser un monto numérico' })
  .finite('Debe ser un monto válido')
  .min(0, 'El monto no puede ser negativo')
  .max(MAX_CAJA_AMOUNT, 'El monto excede el máximo permitido')
  .transform(roundCurrency);

const denominacionesSchema = z
  .record(
    z.string(),
    z
      .number({ invalid_type_error: 'La cantidad debe ser numérica' })
      .finite('La cantidad debe ser válida')
      .int('La cantidad debe ser entera')
      .min(0, 'La cantidad no puede ser negativa')
      .max(MAX_DENOMINATION_COUNT, 'La cantidad excede el máximo permitido'),
  )
  .superRefine((denominaciones, ctx) => {
    for (const key of Object.keys(denominaciones)) {
      if (!CAJA_DENOMINACIONES_SET.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Denominación no permitida: ${key}`,
          path: [key],
        });
      }
    }
  });

function denominacionesTotal(denominaciones: Record<string, number>): number {
  return roundCurrency(
    CAJA_DENOMINACIONES.reduce(
      (total, denominacion) => total + (denominaciones[denominacion] ?? 0) * Number(denominacion),
      0,
    ),
  );
}

export const createVentaDetalleSchema = z.object({
  articuloId:     z.number().int().positive(),
  cantidad:       z.number().int().positive(),
  precioUnitario: z.number().min(0),
  descuento:      z.number().min(0).max(100).default(0),
});

export const createVentaSchema = z.object({
  clienteId:    z.number().int().positive().optional(),
  metodoPago:   z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CREDITO']).default('EFECTIVO'),
  descuento:    z.number().min(0).default(0),
  usarNCF:      z.boolean().default(false),
  tipoNCF:      z.enum(['01', '02', '04', '14', '15']).optional(),
  notas:        z.string().max(500).optional(),
  fechaVenta:   z.string().optional(),
  /** Sesión de caja POS (caja_aperturas.id) — obligatorio para auditoría */
  cajaAperturaId: z.number().int().positive(),
  pagos: z.array(z.object({
    metodo: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CREDITO']),
    monto:  z.number().min(0.01),
  })).optional(),
  /** Efectivo entregado por el cliente (para calcular cambio; solo pago EFECTIVO) */
  efectivoRecibido: z.number().min(0).optional(),
  /** Delivery */
  esDelivery:          z.boolean().default(false),
  deliveryCargo:       z.number().min(0).default(0),
  deliveryDireccion:   z.string().max(300).optional(),
  detalles:     z.array(createVentaDetalleSchema).min(1, 'Debe tener al menos un artículo'),
}).refine(
  (d) => !d.usarNCF || (d.usarNCF && d.tipoNCF),
  { message: 'Debe seleccionar tipo de comprobante cuando usarNCF es true', path: ['tipoNCF'] }
);

export const aperturaCajaSchema = z.object({
  /** Catálogo de cajas — si se envía, tiene prioridad sobre cajaNombre */
  cajaId:         z.number().int().positive().optional(),
  cajaNombre:     z.string().min(1).max(100).optional(),
  denominaciones: denominacionesSchema,
  montoApertura:  currencySchema,
  tiendaId:       z.number().int().positive().optional(),
}).refine((d) => d.cajaId != null || (d.cajaNombre != null && d.cajaNombre.trim().length > 0), {
  message: 'Indique cajaId (catálogo) o cajaNombre',
  path:    ['cajaNombre'],
}).refine((d) => d.cajaId != null || d.tiendaId != null, {
  message: 'Seleccione una sucursal para abrir caja',
  path:    ['tiendaId'],
}).refine((d) => denominacionesTotal(d.denominaciones) === d.montoApertura, {
  message: 'El monto de apertura no coincide con el conteo de denominaciones',
  path:    ['montoApertura'],
});

export const cierreCajaSchema = z.object({
  aperturaId:     z.number().int().positive(),
  denominaciones: denominacionesSchema,
  montoCierre:    currencySchema,
  notas:          z.string().max(500).optional(),
}).refine((d) => denominacionesTotal(d.denominaciones) === d.montoCierre, {
  message: 'El monto de cierre no coincide con el conteo de denominaciones',
  path:    ['montoCierre'],
});

export const updateVentaSchema = z.object({
  metodoPago:        z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CREDITO']).optional(),
  clienteId:         z.number().int().positive().nullable().optional(),
  descuento:         z.number().min(0).optional(),
  notas:             z.string().max(500).nullable().optional(),
  esDelivery:        z.boolean().optional(),
  deliveryCargo:     z.number().min(0).optional(),
  deliveryDireccion: z.string().max(300).nullable().optional(),
});

export const fullUpdateVentaSchema = z.object({
  metodoPago: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CREDITO']),
  clienteId:  z.number().int().positive().nullable().optional(),
  descuento:  z.number().min(0).default(0),
  notas:      z.string().max(500).nullable().optional(),
  detalles:   z.array(createVentaDetalleSchema).min(1, 'Debe tener al menos un artículo'),
  /** Si se omiten, se conservan los valores actuales de la venta (compat. clientes viejos). */
  esDelivery:        z.boolean().optional(),
  deliveryCargo:     z.number().min(0).optional(),
  deliveryDireccion: z.string().max(300).optional().nullable(),
});
export type FullUpdateVentaDto = z.infer<typeof fullUpdateVentaSchema>;

export const historialCajasQuerySchema = z.object({
  page:                z.coerce.number().int().positive().default(1),
  limit:               z.coerce.number().int().positive().max(100).default(20),
  desde:               z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hasta:               z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tiendaId:            z.coerce.number().int().positive().optional(),
  cajaId:              z.coerce.number().int().positive().optional(),
  estado:              z.enum(['abierta', 'cerrada', 'todas']).default('cerrada'),
  incluirIntegracion:  z
    .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
    .optional()
    .transform((v) => {
      if (v === undefined) return false;
      if (typeof v === 'boolean') return v;
      return v === 'true' || v === '1';
    }),
});

export type CreateVentaDto  = z.infer<typeof createVentaSchema>;
export type UpdateVentaDto  = z.infer<typeof updateVentaSchema>;
export type AperturaCajaDto = z.infer<typeof aperturaCajaSchema>;
export type CierreCajaDto   = z.infer<typeof cierreCajaSchema>;
export type HistorialCajasQueryDto = z.infer<typeof historialCajasQuerySchema>;
