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
  pagos: z.array(z.object({
    metodo: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CREDITO']),
    monto:  z.number().min(0.01),
  })).optional(),
  detalles:     z.array(createVentaDetalleSchema).min(1, 'Debe tener al menos un artículo'),
}).refine(
  (d) => !d.usarNCF || (d.usarNCF && d.tipoNCF),
  { message: 'Debe seleccionar tipo de comprobante cuando usarNCF es true', path: ['tipoNCF'] }
);

export const aperturaCajaSchema = z.object({
  cajaNombre:     z.string().min(1).max(50),
  denominaciones: z.record(z.string(), z.number().min(0)),
  montoApertura:  z.number().min(0),
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
