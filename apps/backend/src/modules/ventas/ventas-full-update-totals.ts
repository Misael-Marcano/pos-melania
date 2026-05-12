/**
 * Pure totals for PUT /ventas/:id (full update). Mirrors {@link VentasService.fullUpdate}
 * header math for subtotal, global discount, delivery flag/cargo, and total.
 *
 * Callers must reject saves when `total < 0` (global `descuento` greater than subtotal + delivery cargo).
 */
/** User-facing message when global discount would make the sale total negative. */
export const FULL_UPDATE_DESCUENTO_EXCEDE_MSG =
  'El descuento no puede exceder el subtotal más el costo de envío.';

/** When non-null, full update must not persist (global discount exceeds subtotal + delivery cargo). */
export function fullUpdateVentaTotalViolationMessage(total: number): string | null {
  return total < 0 ? FULL_UPDATE_DESCUENTO_EXCEDE_MSG : null;
}

export type FullUpdateVentaDeliveryVentaSlice = {
  esDelivery?: boolean;
  deliveryCargo?: number | string | null;
  deliveryDireccion?: string | null;
};

export type FullUpdateVentaDeliveryDtoSlice = {
  esDelivery?: boolean;
  deliveryCargo?: number;
  deliveryDireccion?: string | null;
};

export function computeFullUpdateVentaTotals(input: {
  subtotal: number;
  descuento: number;
  venta: FullUpdateVentaDeliveryVentaSlice;
  dto: FullUpdateVentaDeliveryDtoSlice;
}): {
  esDelivery: boolean;
  deliveryCargo: number;
  deliveryDireccion: string | null;
  total: number;
} {
  const { subtotal, descuento, venta, dto } = input;
  const esDelivery =
    dto.esDelivery !== undefined ? dto.esDelivery : Boolean(venta.esDelivery);
  const deliveryCargo = esDelivery
    ? (dto.deliveryCargo !== undefined ? dto.deliveryCargo : Number(venta.deliveryCargo ?? 0))
    : 0;
  const deliveryDireccion = esDelivery
    ? (dto.deliveryDireccion !== undefined
      ? dto.deliveryDireccion
      : (venta.deliveryDireccion ?? null))
    : null;
  const total = subtotal - descuento + deliveryCargo;
  return { esDelivery, deliveryCargo, deliveryDireccion, total };
}
