import { z } from 'zod';

export const ingredienteRecetaSchema = z.object({
  articuloId: z.number().int().positive(),
  cantidad:   z.number().positive(),
});

export const createRecetaSchema = z.object({
  nombre:               z.string().min(1).max(200),
  descripcion:          z.string().max(2000).optional(),
  articuloResultadoId:  z.number().int().positive(),
  cantidadResultado:    z.number().positive().optional(),
  ingredientes:         z.array(ingredienteRecetaSchema).min(1, 'Al menos un ingrediente'),
});

export const updateRecetaSchema = createRecetaSchema.partial().extend({
  ingredientes: z.array(ingredienteRecetaSchema).min(1).optional(),
});

export const producirRecetaSchema = z.object({
  lotes: z.number().int().positive(),
});

export type CreateRecetaDto = z.infer<typeof createRecetaSchema>;
export type UpdateRecetaDto = z.infer<typeof updateRecetaSchema>;
export type ProducirRecetaDto = z.infer<typeof producirRecetaSchema>;
