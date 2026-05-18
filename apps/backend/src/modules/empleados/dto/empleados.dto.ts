import { z } from 'zod';

export const createEmpleadoSchema = z.object({
  nombre:   z.string().min(1).max(200),
  correo:   z.string().email(),
  telefono: z.string().max(20).optional(),
  rol:      z.enum(['admin', 'cajero', 'soporte', 'contador']),
  password: z.string().min(6),
  foto:     z.string().url().optional(),
  /** Obligatorio para cajero y soporte; omitir o null para administrador */
  tiendaId: z.number().int().positive().optional().nullable(),
});

export const updateEmpleadoSchema = createEmpleadoSchema.omit({ password: true }).partial().extend({
  password: z.string().min(6).optional(),
});

export type CreateEmpleadoDto = z.infer<typeof createEmpleadoSchema>;
export type UpdateEmpleadoDto = z.infer<typeof updateEmpleadoSchema>;
