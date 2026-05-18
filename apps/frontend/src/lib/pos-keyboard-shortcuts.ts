/** Atajos del POS — teclas de función para no interferir con el escáner ni la escritura normal. */

/** Denominaciones RD$ para atajos 1–6 en cobro en efectivo. */
export const POS_BILLETES_RD = [2000, 1000, 500, 200, 100, 50] as const;

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  return target.isContentEditable;
}

export const POS_SHORTCUT_GROUPS = [
  {
    title: 'Carrito',
    items: [
      { keys: 'F2', desc: 'Buscar artículo' },
      { keys: 'F3', desc: 'Mostrar / ocultar cuadrícula' },
      { keys: 'F4', desc: 'Buscar cliente' },
      { keys: 'F5', desc: 'Escanear con cámara' },
      { keys: 'F6', desc: 'Pausar venta' },
      { keys: 'F7', desc: 'Ventas en pausa' },
      { keys: 'F8', desc: 'Ir a cobrar' },
      { keys: '↑ / ↓', desc: 'Seleccionar línea del carrito' },
      { keys: '+ / −', desc: 'Subir / bajar cantidad de la línea' },
      { keys: 'Del', desc: 'Quitar línea seleccionada' },
      { keys: 'Shift+Del', desc: 'Vaciar carrito' },
    ],
  },
  {
    title: 'Pago',
    items: [
      { keys: 'F1–F5', desc: 'Forma de pago (efectivo, tarjeta, …)' },
      { keys: '1–6', desc: 'Billetes RD$ (2000…50, si cubren el total)' },
      { keys: 'F9', desc: 'Efectivo exacto' },
      { keys: 'F10', desc: 'Confirmar venta' },
      { keys: 'Esc', desc: 'Volver al carrito' },
      { keys: 'Ctrl+Enter', desc: 'Confirmar venta' },
    ],
  },
  {
    title: 'General',
    items: [
      { keys: '?', desc: 'Mostrar / ocultar esta ayuda' },
    ],
  },
] as const;
