import type { Venta } from '../../entities/Venta.entity';
import type { VentaDetalle } from '../../entities/VentaDetalle.entity';

/**
 * After replacing `venta_detalles` in the DB, reattach the persisted line entities to the
 * loaded {@link Venta} before `manager.save(Venta, venta)`.
 *
 * If `venta.detalles` still pointed at rows removed via `delete()`, TypeORM's cascade persist
 * on the parent could emit `UPDATE venta_detalles SET ventaId = NULL` for those orphaned
 * in-memory entities (SQL Server: "Cannot insert the value NULL into column 'ventaId'").
 */
export function syncFullUpdateVentaDetalleGraph(venta: Venta, nuevosDetalles: VentaDetalle[]): void {
  for (const d of nuevosDetalles) {
    d.venta = venta;
  }
  venta.detalles = nuevosDetalles;
}

/**
 * Removes the in-memory `VentaDetalle.venta` back-reference set in {@link syncFullUpdateVentaDetalleGraph}
 * (and sometimes by TypeORM) so `res.json(venta)` / `JSON.stringify` does not throw on a
 * venta ↔ detalles cycle.
 */
export function stripVentaDetalleParentRef(venta: Venta): void {
  for (const d of venta.detalles ?? []) {
    delete (d as { venta?: Venta }).venta;
  }
}
