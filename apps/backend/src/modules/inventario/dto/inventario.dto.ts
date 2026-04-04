import { z } from 'zod';

export const createArticuloSchema = z.object({
  codigoBarras: z.string().min(1).max(50),
  nombre:       z.string().min(1).max(200),
  costo:        z.number().min(0),
  precioVenta:  z.number().min(0),
  cantidad:     z.number().int().optional(),
  tamanio:      z.string().max(50).optional(),
  categoriaId:  z.number().int().positive(),
  foto:         z.string().max(500).optional(),
});

export const updateArticuloSchema = createArticuloSchema.partial();

export const createCategoriaSchema = z.object({
  nombre: z.string().min(1).max(100),
});

export const ajustarInventarioSchema = z.object({
  cantidad: z.number().int(),
  motivo:   z.string().max(200).optional(),
});

export type CreateArticuloDto  = z.infer<typeof createArticuloSchema>;
export type UpdateArticuloDto  = z.infer<typeof updateArticuloSchema>;
export type CreateCategoriaDto = z.infer<typeof createCategoriaSchema>;
export type AjustarInventarioDto = z.infer<typeof ajustarInventarioSchema>;
