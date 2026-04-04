import { create } from 'zustand';
import { CartItem } from './cart.store';

export interface PausedCart {
  id:              string;
  label:           string;
  items:           CartItem[];
  clienteId:       number | null;
  clienteNombre:   string;
  descuentoGlobal: number;
  total:           number;
  savedAt:         string;
}

interface PausedCartsStore {
  carts:   PausedCart[];
  pause:   (cart: Omit<PausedCart, 'id' | 'savedAt'>) => string;
  restore: (id: string) => PausedCart | null;
  remove:  (id: string) => void;
  clear:   () => void;
}

export const usePausedCartsStore = create<PausedCartsStore>((set, get) => ({
  carts: [],

  pause: (cart) => {
    const id = Date.now().toString();
    set((state) => ({
      carts: [
        ...state.carts,
        { ...cart, id, savedAt: new Date().toISOString() },
      ],
    }));
    return id;
  },

  restore: (id) => {
    const cart = get().carts.find((c) => c.id === id) ?? null;
    if (cart) set((state) => ({ carts: state.carts.filter((c) => c.id !== id) }));
    return cart;
  },

  remove: (id) =>
    set((state) => ({ carts: state.carts.filter((c) => c.id !== id) })),

  clear: () => set({ carts: [] }),
}));
