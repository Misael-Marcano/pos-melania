import { z } from 'zod';

export const createCajaSchema = z.object({
  nombre:   z.string().min(1).max(100).trim(),
  tiendaId: z.number().int().positive(),
  notas:    z.string().max(2000).optional(),
});

export const updateCajaSchema = z.object({
  nombre:   z.string().min(1).max(100).trim().optional(),
  tiendaId: z.number().int().positive().optional(),
  activo:   z.boolean().optional(),
  notas:    z.string().max(2000).nullable().optional(),
});

export type CreateCajaDto = z.infer<typeof createCajaSchema>;
export type UpdateCajaDto = z.infer<typeof updateCajaSchema>;
