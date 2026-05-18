import { z } from 'zod';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const reportesRangoFechasSchema = z
  .object({
    desde: z.string().regex(ISO_DATE, 'desde debe ser YYYY-MM-DD'),
    hasta: z.string().regex(ISO_DATE, 'hasta debe ser YYYY-MM-DD'),
    tiendaId: z
      .union([z.string(), z.number()])
      .optional()
      .transform((v) => {
        if (v === undefined || v === '' || v === null) return null;
        const n = typeof v === 'number' ? v : Number(v);
        return Number.isFinite(n) && n > 0 ? n : null;
      }),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.desde > data.hasta) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'desde no puede ser posterior a hasta',
        path: ['desde'],
      });
    }
    const d0 = new Date(`${data.desde}T00:00:00`);
    const d1 = new Date(`${data.hasta}T00:00:00`);
    const diffDays = Math.round((d1.getTime() - d0.getTime()) / 86_400_000);
    if (diffDays > 366) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El rango máximo es 366 días',
        path: ['hasta'],
      });
    }
  });

export const reportesResumenDiaSchema = z.object({
  fecha: z
    .string()
    .regex(ISO_DATE, 'fecha debe ser YYYY-MM-DD')
    .optional()
    .default(() => new Date().toISOString().split('T')[0]),
  tiendaId: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === '' || v === null) return null;
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isFinite(n) && n > 0 ? n : null;
    }),
});

export const reportesPeriodoDgiiSchema = z.object({
  periodo: z.string().regex(/^\d{6}$/, 'periodo debe ser YYYYMM'),
});

export const reportesCompararPeriodosSchema = z.object({
  referencia: z
    .string()
    .regex(ISO_DATE, 'referencia debe ser YYYY-MM-DD')
    .optional()
    .default(() => new Date().toISOString().split('T')[0]),
  tiendaId: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === '' || v === null) return null;
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isFinite(n) && n > 0 ? n : null;
    }),
});

export const inventarioValorizadoQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().max(120).optional().default(''),
});

export type ReportesRangoFechasQuery = z.infer<typeof reportesRangoFechasSchema>;
export type ReportesResumenDiaQuery = z.infer<typeof reportesResumenDiaSchema>;
export type InventarioValorizadoQuery = z.infer<typeof inventarioValorizadoQuerySchema>;

export const reportesStockAlertaSchema = z.object({
  umbral: z.coerce.number().int().min(0).max(10_000).default(5),
  diasSinMovimiento: z.coerce.number().int().min(1).max(730).default(90),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

export type ReportesStockAlertaQuery = z.infer<typeof reportesStockAlertaSchema>;
