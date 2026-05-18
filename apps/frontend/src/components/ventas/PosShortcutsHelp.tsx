'use client';

import { X, Keyboard } from 'lucide-react';
import { POS_SHORTCUT_GROUPS } from '@/lib/pos-keyboard-shortcuts';

interface Props {
  onClose: () => void;
}

export function PosShortcutsHelp({ onClose }: Props) {
  return (
    <div
      className="fixed bottom-3 left-3 right-3 md:left-auto md:right-4 md:bottom-4 md:w-[min(22rem,calc(100vw-2rem))] z-40 bg-white border border-navy-200 rounded-xl shadow-float overflow-hidden"
      role="dialog"
      aria-label="Atajos de teclado del POS"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-navy-100 bg-navy-50/80">
        <span className="flex items-center gap-2 text-sm font-semibold text-navy-800">
          <Keyboard size={16} className="text-primary-600" aria-hidden />
          Atajos de teclado
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-navy-400 hover:text-navy-700 hover:bg-navy-100 transition-colors"
          aria-label="Cerrar ayuda de atajos"
        >
          <X size={16} />
        </button>
      </div>
      <div className="max-h-[min(50vh,20rem)] overflow-y-auto p-3 space-y-3">
        {POS_SHORTCUT_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-navy-400 mb-1.5">
              {group.title}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => (
                <li key={item.keys} className="flex items-start justify-between gap-3 text-xs">
                  <kbd className="shrink-0 font-mono text-[10px] font-semibold bg-navy-100 text-navy-700 px-1.5 py-0.5 rounded border border-navy-200/80">
                    {item.keys}
                  </kbd>
                  <span className="text-navy-600 text-right leading-snug">{item.desc}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="px-3 py-2 text-[10px] text-navy-400 border-t border-navy-100 bg-navy-50/50">
        Pulsa <kbd className="font-mono font-semibold text-navy-600">?</kbd> para ocultar
      </p>
    </div>
  );
}
