import { z } from 'zod';
import {
  COMPROBANTE_DEFECTO_VALUES,
  DEFAULT_REPORTES_TZ,
  FISCAL_JURISDICTION_VALUES,
  isValidItbisRate,
  isValidReportesTimezone,
  isValidRnc,
  normalizeRnc,
} from '@pos/shared';

const optionalUrl = z
  .string()
  .max(500)
  .optional()
  .nullable()
  .transform((v) => {
    const t = (v ?? '').trim();
    return t === '' ? null : t;
  })
  .refine((v) => v == null || /^https?:\/\//i.test(v), {
    message: 'Debe ser una URL que comience con http:// o https://',
  });

const optionalRnc = z
  .string()
  .max(20)
  .optional()
  .nullable()
  .transform((v) => {
    const digits = normalizeRnc(v);
    return digits === '' ? null : digits;
  })
  .refine((v) => isValidRnc(v), { message: 'RNC inválido: use 9 u 11 dígitos' });

const taxRate = z
  .union([z.number(), z.string()])
  .transform((v) => Number(v))
  .refine((n) => isValidItbisRate(n), {
    message: `La tasa debe estar entre 0 y 100 con máximo 2 decimales`,
  });

const tiendaCajaId = z
  .union([z.number(), z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === null || v === '' || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  });

export const updateConfiguracionSchema = z
  .object({
    nombreCompania: z.string().trim().min(1, 'El nombre de la empresa es obligatorio').max(200),
    rnc: optionalRnc,
    direccion: z.string().max(300).optional().nullable(),
    telefono: z
      .string()
      .max(30)
      .optional()
      .nullable()
      .transform((v) => {
        const t = (v ?? '').trim();
        return t === '' ? null : t;
      })
      .refine(
        (v) => v == null || /^[\d\s+\-().]{6,30}$/.test(v),
        { message: 'Teléfono inválido' },
      ),
    sitioWeb: optionalUrl,
    logotipoUrl: optionalUrl,
    textoPieRecibo: z.string().max(4000).optional().nullable(),
    simboloMoneda: z.string().trim().min(1).max(10),
    numeroDecimales: z.union([z.literal(0), z.literal(2), z.number()]).transform((v) =>
      v === 0 ? 0 : 2,
    ),
    preciosIncluyenImpuesto: z.boolean(),
    tasaImpuesto1Nombre: z.string().max(50).optional().nullable(),
    tasaImpuesto1: taxRate,
    tasaImpuesto2Nombre: z.string().max(50).optional().nullable(),
    tasaImpuesto2: taxRate,
    comprobanteDefecto: z.enum(COMPROBANTE_DEFECTO_VALUES),
    fiscalJurisdiccion: z
      .enum(FISCAL_JURISDICTION_VALUES)
      .nullable()
      .optional(),
    zonaHoraria: z
      .string()
      .max(64)
      .optional()
      .nullable()
      .transform((v) => {
        const t = (v ?? '').trim();
        return t === '' ? DEFAULT_REPORTES_TZ : t;
      })
      .refine((v) => isValidReportesTimezone(v), {
        message: 'Zona horaria no soportada para reportes',
      }),
    nombreCaja: z.string().trim().min(1).max(100),
    tiendaId: tiendaCajaId,
    cajaId: tiendaCajaId,
  })
  .strict();

export type UpdateConfiguracionDto = z.infer<typeof updateConfiguracionSchema>;

/** Campos que nunca se aplican desde el body (relaciones / metadatos). */
export const CONFIGURACION_FORBIDDEN_KEYS = new Set([
  'id',
  'tenantId',
  'tenant',
  'updatedAt',
  'tienda',
  'caja',
  'createdAt',
]);
