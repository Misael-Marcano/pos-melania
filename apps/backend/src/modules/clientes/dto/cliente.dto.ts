import { z } from 'zod';

export const createClienteSchema = z.object({
  nombre:               z.string().min(1).max(200),
  compania:             z.string().max(200).optional(),
  correo:               z.string().email().optional().or(z.literal('')),
  telefono:             z.string().max(20).optional(),
  tipoIdentificacion:   z.enum(['CEDULA', 'RNC', 'PASAPORTE']).optional(),
  numeroIdentificacion: z.string().max(30).optional(),
});

export const updateClienteSchema = createClienteSchema.partial();

export type CreateClienteDto = z.infer<typeof createClienteSchema>;
export type UpdateClienteDto = z.infer<typeof updateClienteSchema>;
