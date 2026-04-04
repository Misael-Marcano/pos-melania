import { z } from 'zod';

export const createTarjetaSchema = z.object({
  saldoInicial:      z.number().positive(),
  fechaVencimiento:  z.string().optional(),   // YYYY-MM-DD
  notas:             z.string().max(500).optional(),
});

export const recargarTarjetaSchema = z.object({
  monto: z.number().positive(),
  notas: z.string().max(500).optional(),
});

export const usarTarjetaSchema = z.object({
  monto: z.number().positive(),
  notas: z.string().max(500).optional(),
});

export const updateTarjetaSchema = z.object({
  fechaVencimiento: z.string().optional(),
  notas:            z.string().max(500).optional(),
  estado:           z.enum(['ACTIVA', 'CANCELADA']).optional(),
});

export type CreateTarjetaDto  = z.infer<typeof createTarjetaSchema>;
export type RecargarTarjetaDto = z.infer<typeof recargarTarjetaSchema>;
export type UsarTarjetaDto     = z.infer<typeof usarTarjetaSchema>;
export type UpdateTarjetaDto   = z.infer<typeof updateTarjetaSchema>;
