'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Portal } from './Portal';

interface ModalProps {
  open:         boolean;
  onClose:      () => void;
  title:        string;
  children:     React.ReactNode;
  size?:        'sm' | 'md' | 'lg' | 'xl';
  footer?:      React.ReactNode;
}

const sizeClasses = {
  sm:  'max-w-sm',
  md:  'max-w-md',
  lg:  'max-w-lg',
  xl:  'max-w-2xl',
};

export function Modal({ open, onClose, title, children, size = 'md', footer }: ModalProps) {
  // ESC para cerrar
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-navy-900/40 backdrop-blur-[2px]" onClick={onClose} />

      {/* Dialog */}
      <div className={cn('relative bg-white rounded-[12px] shadow-float w-full flex flex-col max-h-[90vh]', sizeClasses[size])}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0">
          <h3 className="font-semibold text-navy-800 text-base font-display">{title}</h3>
          <button
            onClick={onClose}
            className="text-navy-400 hover:text-navy-700 transition-colors rounded-lg p-1.5 hover:bg-navy-50"
          >
            <X size={17} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 pb-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-3 bg-navy-50/60 rounded-b-[12px] shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
    </Portal>
  );
}
