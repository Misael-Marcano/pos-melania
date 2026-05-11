import { z } from 'zod';

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
  denominaciones: z.record(z.string(), z.number().min(0)),
  montoApertura:  z.number().min(0),
  tiendaId:       z.number().int().positive().optional(),
}).refine((d) => d.cajaId != null || (d.cajaNombre != null && d.cajaNombre.trim().length > 0), {
  message: 'Indique cajaId (catálogo) o cajaNombre',
  path:    ['cajaNombre'],
});

export const cierreCajaSchema = z.object({
  aperturaId:     z.number().int().positive(),
  denominaciones: z.record(z.string(), z.number().min(0)),
  montoCierre:    z.number().min(0),
  notas:          z.string().max(500).optional(),
});

export const updateVentaSchema = z.object({
  metodoPago: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CREDITO']).optional(),
  clienteId:  z.number().int().positive().nullable().optional(),
  notas:      z.string().max(500).nullable().optional(),
});

export const fullUpdateVentaSchema = z.object({
  metodoPago: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CREDITO']),
  clienteId:  z.number().int().positive().nullable().optional(),
  descuento:  z.number().min(0).default(0),
  notas:      z.string().max(500).nullable().optional(),
  detalles:   z.array(createVentaDetalleSchema).min(1, 'Debe tener al menos un artículo'),
});
export type FullUpdateVentaDto = z.infer<typeof fullUpdateVentaSchema>;

export type CreateVentaDto  = z.infer<typeof createVentaSchema>;
export type UpdateVentaDto  = z.infer<typeof updateVentaSchema>;
export type AperturaCajaDto = z.infer<typeof aperturaCajaSchema>;
export type CierreCajaDto   = z.infer<typeof cierreCajaSchema>;
