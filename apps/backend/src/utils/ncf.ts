import { AppDataSource } from '../config/database';
import { Comprobante } from '../entities/Comprobante.entity';
import { TipoComprobante } from '@pos/shared';
import { EntityManager } from 'typeorm';

/**
 * Genera el próximo NCF para el tipo indicado dentro de una transacción.
 * Pasar `manager` garantiza que el incremento se revierte si la transacción falla.
 * Ejemplo salida: B0200000001
 */
export const generarNCF = async (
  tipo:     TipoComprobante,
  manager?: EntityManager,
): Promise<string> => {
  const repo = manager
    ? manager.getRepository(Comprobante)
    : AppDataSource.getRepository(Comprobante);

  const comprobante = await repo.findOne({ where: { tipo, activo: true } });
  if (!comprobante) throw new Error(`No hay comprobante activo para tipo ${tipo}`);

  // secuenciaActual puede ser "00000001" (entrada inicial) o "B0200000001" (formato NCF completo).
  // Siempre tomamos los últimos 8 caracteres que corresponden al número de secuencia puro.
  const secActual = parseInt(comprobante.secuenciaActual.slice(-8), 10);
  const secHasta  = parseInt(comprobante.hasta.slice(-8), 10);

  if (secActual > secHasta) {
    throw new Error(`Secuencia de comprobante tipo ${tipo} agotada`);
  }

  // NCF: Series + Tipo(2) + Secuencia(8)  →  e.g. B0200000001
  const ncf = `${comprobante.series}${tipo.padStart(2, '0')}${String(secActual).padStart(8, '0')}`;

  // Avanzar secuencia
  const siguiente = secActual + 1;
  comprobante.secuenciaActual = `${comprobante.series}${tipo.padStart(2, '0')}${String(siguiente).padStart(8, '0')}`;
  await repo.save(comprobante);

  return ncf;
};
