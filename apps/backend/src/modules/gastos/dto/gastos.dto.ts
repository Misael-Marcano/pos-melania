import { z } from 'zod';

export const createGastoSchema = z.object({
  escribe:          z.string().min(1).max(200),
  descripcion:      z.string().max(500).optional(),
  categoria:        z.string().min(1).max(100),
  fecha:            z.string(),          // ISO date
  cantidad:         z.number().positive(),
  impuesto:         z.number().min(0).default(0),
  nombreRecipiente: z.string().max(200).optional(),
});

export const updateGastoSchema = createGastoSchema.partial();

export type CreateGastoDto = z.infer<typeof createGastoSchema>;
export type UpdateGastoDto = z.infer<typeof updateGastoSchema>;
