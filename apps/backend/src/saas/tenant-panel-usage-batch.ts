import { AppDataSource } from '../config/database';
import { Usuario } from '../entities/Usuario.entity';
import { Tienda } from '../entities/Tienda.entity';
import { Articulo } from '../entities/Articulo.entity';
import { Venta } from '../entities/Venta.entity';

export interface TenantPanelUsageCounts {
  seats:            number;
  tiendasActivas:   number;
  articulosActivos: number;
  ventasMesActual:  number;
}

export type TenantUsageCountMaps = {
  seats:           Map<number, number>;
  tiendas:         Map<number, number>;
  articulos:       Map<number, number>;
  ventasMesActual: Map<number, number>;
};

type CountRow = { tenantId: string | number; cnt: string | number };

/** Convierte filas `GROUP BY tenantId` en mapa tenant → count. */
export function rowsToCountMap(rows: CountRow[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const r of rows) {
    m.set(Number(r.tenantId), Number(r.cnt));
  }
  return m;
}

export function pickUsage(maps: TenantUsageCountMaps, tenantId: number): TenantPanelUsageCounts {
  return {
    seats:            maps.seats.get(tenantId) ?? 0,
    tiendasActivas:   maps.tiendas.get(tenantId) ?? 0,
    articulosActivos: maps.articulos.get(tenantId) ?? 0,
    ventasMesActual:  maps.ventasMesActual.get(tenantId) ?? 0,
  };
}

function monthBounds(): { inicioMes: Date; finMes: Date } {
  const ahora = new Date();
  return {
    inicioMes: new Date(ahora.getFullYear(), ahora.getMonth(), 1),
    finMes:    new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1),
  };
}

/**
 * Cuatro agregaciones agrupadas por tenant (en lugar de N×4 COUNT por organización).
 * Usado por `GET /api/v1/tenants/panel`.
 */
export async function fetchTenantPanelUsageMaps(): Promise<TenantUsageCountMaps> {
  const { inicioMes, finMes } = monthBounds();

  const [seatsRows, tiendasRows, articulosRows, ventasRows] = await Promise.all([
    AppDataSource.getRepository(Usuario)
      .createQueryBuilder('u')
      .select('u.tenantId', 'tenantId')
      .addSelect('COUNT(*)', 'cnt')
      .where('u.activo = 1')
      .andWhere('u.rol != :plat', { plat: 'plataforma' })
      .groupBy('u.tenantId')
      .getRawMany<CountRow>(),

    AppDataSource.getRepository(Tienda)
      .createQueryBuilder('t')
      .select('t.tenantId', 'tenantId')
      .addSelect('COUNT(*)', 'cnt')
      .where('t.activo = 1')
      .groupBy('t.tenantId')
      .getRawMany<CountRow>(),

    AppDataSource.getRepository(Articulo)
      .createQueryBuilder('a')
      .select('a.tenantId', 'tenantId')
      .addSelect('COUNT(*)', 'cnt')
      .where('a.activo = 1')
      .groupBy('a.tenantId')
      .getRawMany<CountRow>(),

    AppDataSource.getRepository(Venta)
      .createQueryBuilder('v')
      .innerJoin('v.cajaApertura', 'ca')
      .innerJoin('ca.tienda', 't')
      .select('t.tenantId', 'tenantId')
      .addSelect('COUNT(*)', 'cnt')
      .where("CHARINDEX('[ANULADA]', ISNULL(v.notas, '')) = 0")
      .andWhere('v.fecha >= :ini', { ini: inicioMes })
      .andWhere('v.fecha < :fin', { fin: finMes })
      .groupBy('t.tenantId')
      .getRawMany<CountRow>(),
  ]);

  return {
    seats:           rowsToCountMap(seatsRows),
    tiendas:         rowsToCountMap(tiendasRows),
    articulos:       rowsToCountMap(articulosRows),
    ventasMesActual: rowsToCountMap(ventasRows),
  };
}
