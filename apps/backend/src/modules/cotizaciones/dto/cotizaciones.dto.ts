import { z } from 'zod';

export const cotizacionDetalleSchema = z.object({
  articuloId:     z.number().int().positive(),
  cantidad:       z.number().int().positive(),
  precioUnitario: z.number().min(0),
  descuento:      z.number().min(0).max(100).default(0),
});

export const createCotizacionSchema = z.object({
  clienteId:   z.number().int().positive().optional(),
  validezDias: z.number().int().positive().default(30),
  notas:       z.string().max(500).optional(),
  descuento:   z.number().min(0).max(100).default(0),
  detalles:    z.array(cotizacionDetalleSchema).min(1, 'Debe incluir al menos un artículo'),
});

export const updateCotizacionSchema = createCotizacionSchema.partial().extend({
  detalles: z.array(cotizacionDetalleSchema).min(1).optional(),
});

export const cambiarEstadoSchema = z.object({
  estado: z.enum(['BORRADOR', 'ENVIADA', 'ACEPTADA', 'RECHAZADA', 'VENCIDA']),
});

export type CreateCotizacionDto = z.infer<typeof createCotizacionSchema>;
export type UpdateCotizacionDto = z.infer<typeof updateCotizacionSchema>;
export type CambiarEstadoDto    = z.infer<typeof cambiarEstadoSchema>;
