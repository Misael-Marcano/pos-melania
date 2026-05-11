import { AppDataSource } from '../config/database';
import { Usuario } from '../entities/Usuario.entity';
import { Tienda } from '../entities/Tienda.entity';
import { Articulo } from '../entities/Articulo.entity';
import { Venta } from '../entities/Venta.entity';

/** Usuarios que cuentan como “asientos” del plan (excluye operadores de plataforma). */
export async function countSeatsForTenant(tenantId: number): Promise<number> {
  return AppDataSource.getRepository(Usuario)
    .createQueryBuilder('u')
    .where('u.tenantId = :tid', { tid: tenantId })
    .andWhere('u.activo = 1')
    .andWhere('u.rol != :plat', { plat: 'plataforma' })
    .getCount();
}

export async function countTiendasActivasForTenant(tenantId: number): Promise<number> {
  return AppDataSource.getRepository(Tienda).count({
    where: { tenant: { id: tenantId }, activo: true },
  });
}

/** Artículos activos en catálogo del tenant. */
export async function countArticulosActivosForTenant(tenantId: number): Promise<number> {
  return AppDataSource.getRepository(Articulo).count({
    where: { tenant: { id: tenantId }, activo: true },
  });
}

/**
 * Ventas del mes calendario actual del tenant.
 * Métrica informacional — no se usa como tope duro (bloquear ventas en caja es mala UX).
 */
export async function countVentasMesActualForTenant(tenantId: number): Promise<number> {
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const finMes    = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);

  return AppDataSource.getRepository(Venta)
    .createQueryBuilder('v')
    .innerJoin('v.cajaApertura', 'ca')
    .innerJoin('ca.tienda', 't')
    .where('t.tenantId = :tid', { tid: tenantId })
    .andWhere('v.anulada = 0')
    .andWhere('v.fecha >= :ini', { ini: inicioMes })
    .andWhere('v.fecha < :fin', { fin: finMes })
    .getCount();
}
