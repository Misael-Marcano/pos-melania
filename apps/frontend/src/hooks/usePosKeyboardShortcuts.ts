import { useEffect, useRef } from 'react';
import { isEditableTarget } from '@/lib/pos-keyboard-shortcuts';

export interface PosKeyboardShortcutActions {
  focusSearch: () => void;
  toggleGrid: () => void;
  focusCliente: () => void;
  openCamera: () => void;
  pauseSale: () => void;
  togglePaused: () => void;
  goToPayment: () => void;
  goToCart: () => void;
  setExactCash: () => void;
  confirmSale: () => void;
  clearCart: () => void;
  selectPaymentMethod: (index: number) => void;
  toggleShortcutsHelp: () => void;
  navigateLine: (delta: number) => void;
  adjustLineQty: (delta: number) => void;
  removeFocusedLine: () => void;
  applyQuickBill: (billIndex: number) => void;
}

interface Options {
  enabled: boolean;
  mode: 'cart' | 'payment';
  hasItems: boolean;
  pagoMixto: boolean;
  cashBillsEnabled: boolean;
  actions: PosKeyboardShortcutActions;
}

/**
 * Atajos globales del POS (teclas de función).
 * No captura teclas en inputs salvo Escape, Ctrl+Enter y teclas Fn.
 */
export function usePosKeyboardShortcuts({
  enabled,
  mode,
  hasItems,
  pagoMixto,
  cashBillsEnabled,
  actions,
}: Options) {
  const actionsRef = useRef(actions);
  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  useEffect(() => {
    if (!enabled) return;

    const run = () => actionsRef.current;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      const typing = isEditableTarget(e.target);
      const a = run();

      const helpKey = key === '?' || (e.shiftKey && key === '/');
      if (helpKey && !e.ctrlKey && !e.metaKey && !e.altKey && !typing) {
        e.preventDefault();
        a.toggleShortcutsHelp();
        return;
      }

      if (key === 'Escape') {
        if (mode === 'payment') {
          e.preventDefault();
          a.goToCart();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && key === 'Enter' && mode === 'payment') {
        e.preventDefault();
        a.confirmSale();
        return;
      }

      if (e.shiftKey && key === 'Delete' && mode === 'cart' && hasItems) {
        e.preventDefault();
        a.clearCart();
        return;
      }

      if (!typing && mode === 'cart' && hasItems) {
        if (key === 'ArrowUp') {
          e.preventDefault();
          a.navigateLine(-1);
          return;
        }
        if (key === 'ArrowDown') {
          e.preventDefault();
          a.navigateLine(1);
          return;
        }
        if (key === '+' || key === '=' || key === 'NumpadAdd') {
          e.preventDefault();
          a.adjustLineQty(1);
          return;
        }
        if (key === '-' || key === 'NumpadSubtract') {
          e.preventDefault();
          a.adjustLineQty(-1);
          return;
        }
        if (key === 'Delete') {
          e.preventDefault();
          a.removeFocusedLine();
          return;
        }
      }

      if (!typing && mode === 'payment' && cashBillsEnabled) {
        const digit = Number(key);
        if (digit >= 1 && digit <= 6 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          a.applyQuickBill(digit - 1);
          return;
        }
      }

      const fnMatch = key.match(/^F(\d+)$/);
      if (!fnMatch) return;

      const fn = Number(fnMatch[1]);
      e.preventDefault();

      switch (fn) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
          if (mode === 'payment' && !pagoMixto) {
            a.selectPaymentMethod(fn - 1);
          } else if (fn === 2) {
            a.focusSearch();
          } else if (fn === 3 && mode === 'cart') {
            a.toggleGrid();
          } else if (fn === 4 && mode === 'cart') {
            a.focusCliente();
          } else if (fn === 5 && mode === 'cart') {
            a.openCamera();
          }
          break;
        case 6:
          if (mode === 'cart' && hasItems) a.pauseSale();
          break;
        case 7:
          if (mode === 'cart') a.togglePaused();
          break;
        case 8:
          if (mode === 'cart' && hasItems) a.goToPayment();
          break;
        case 9:
          if (mode === 'payment' && !pagoMixto) a.setExactCash();
          break;
        case 10:
          if (mode === 'payment') a.confirmSale();
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [enabled, mode, hasItems, pagoMixto, cashBillsEnabled]);
}
