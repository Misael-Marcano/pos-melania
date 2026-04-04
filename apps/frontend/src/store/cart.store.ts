import { create } from 'zustand';
import { IArticulo } from '@pos/shared';

export interface CartItem {
  articulo:       IArticulo;
  cantidad:       number;
  precioUnitario: number;
  descuento:      number;
  total:          number;
}

interface CartStore {
  items:          CartItem[];
  clienteId:      number | null;
  descuentoGlobal: number;
  addItem:        (articulo: IArticulo) => void;
  removeItem:     (articuloId: number) => void;
  updateCantidad: (articuloId: number, cantidad: number) => void;
  updateDescuento:(articuloId: number, descuento: number) => void;
  setCliente:     (id: number | null) => void;
  setDescuentoGlobal: (d: number) => void;
  clearCart:      () => void;
  subtotal:       () => number;
  total:          () => number;
}

const calcTotal = (precio: number, cantidad: number, descuento: number) =>
  precio * cantidad * (1 - descuento / 100);

export const useCartStore = create<CartStore>((set, get) => ({
  items:           [],
  clienteId:       null,
  descuentoGlobal: 0,

  addItem: (articulo) =>
    set((state) => {
      const idx = state.items.findIndex((i) => i.articulo.id === articulo.id);
      if (idx >= 0) {
        const items = [...state.items];
        items[idx].cantidad += 1;
        items[idx].total = calcTotal(items[idx].precioUnitario, items[idx].cantidad, items[idx].descuento);
        return { items };
      }
      const newItem: CartItem = {
        articulo,
        cantidad:       1,
        precioUnitario: articulo.precioVenta,
        descuento:      0,
        total:          articulo.precioVenta,
      };
      return { items: [...state.items, newItem] };
    }),

  removeItem: (articuloId) =>
    set((state) => ({ items: state.items.filter((i) => i.articulo.id !== articuloId) })),

  updateCantidad: (articuloId, cantidad) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.articulo.id === articuloId
          ? { ...i, cantidad, total: calcTotal(i.precioUnitario, cantidad, i.descuento) }
          : i
      ),
    })),

  updateDescuento: (articuloId, descuento) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.articulo.id === articuloId
          ? { ...i, descuento, total: calcTotal(i.precioUnitario, i.cantidad, descuento) }
          : i
      ),
    })),

  setCliente:          (id) => set({ clienteId: id }),
  setDescuentoGlobal:  (d)  => set({ descuentoGlobal: d }),
  clearCart:           ()   => set({ items: [], clienteId: null, descuentoGlobal: 0 }),

  subtotal: () => get().items.reduce((acc, i) => acc + i.total, 0),
  total:    () => {
    const sub = get().items.reduce((acc, i) => acc + i.total, 0);
    return sub - get().descuentoGlobal;
  },
}));
