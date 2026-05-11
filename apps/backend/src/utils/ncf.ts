import { AppDataSource } from '../config/database';
import { Comprobante } from '../entities/Comprobante.entity';
import { TipoComprobante } from '@pos/shared';
import { EntityManager } from 'typeorm';

/** Últimos 8 caracteres de una secuencia guardada como "00000001" o NCF completo "B0200000001". */
export const parseNcfSequenceTail = (secuenciaOrNcf: string): number =>
  parseInt(secuenciaOrNcf.slice(-8), 10);

/** NCF: serie + tipo (2) + secuencia (8), p. ej. B0200000001. */
export const buildNcf = (series: string, tipo: TipoComprobante, sequence: number): string =>
  `${series}${tipo.padStart(2, '0')}${String(sequence).padStart(8, '0')}`;

/**
 * Genera el próximo NCF para el tipo indicado dentro de una transacción.
 * Pasar `manager` garantiza que el incremento se revierte si la transacción falla.
 * Ejemplo salida: B0200000001
 */
export const generarNCF = async (
  tipo:     TipoComprobante,
  manager?: EntityManager,
  tenantId = 1,
): Promise<string> => {
  const repo = manager
    ? manager.getRepository(Comprobante)
    : AppDataSource.getRepository(Comprobante);

  const comprobante = await repo.findOne({
    where: { tipo, activo: true, tenant: { id: tenantId } },
  });
  if (!comprobante) throw new Error(`No hay comprobante activo para tipo ${tipo}`);

  // secuenciaActual puede ser "00000001" (entrada inicial) o "B0200000001" (formato NCF completo).
  // Siempre tomamos los últimos 8 caracteres que corresponden al número de secuencia puro.
  const secActual = parseNcfSequenceTail(comprobante.secuenciaActual);
  const secHasta  = parseNcfSequenceTail(comprobante.hasta);

  if (secActual > secHasta) {
    throw new Error(`Secuencia de comprobante tipo ${tipo} agotada`);
  }

  const ncf = buildNcf(comprobante.series, tipo, secActual);

  // Avanzar secuencia
  const siguiente = secActual + 1;
  comprobante.secuenciaActual = buildNcf(comprobante.series, tipo, siguiente);
  await repo.save(comprobante);

  return ncf;
};
