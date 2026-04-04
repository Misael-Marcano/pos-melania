'use client';

import { useEffect } from 'react';
import { Portal } from './Portal';

interface Props {
  onClose?: () => void;
  children: React.ReactNode;
  zIndex?: string;
}

/**
 * Wrapper que renderiza un modal vía Portal (fuera del árbol DOM del layout)
 * y bloquea el scroll del body mientras está montado.
 */
export function ModalOverlay({ onClose, children, zIndex = 'z-50' }: Props) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <Portal>
      <div className={`fixed inset-0 ${zIndex} flex items-center justify-center p-4`}>
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        {/* Content */}
        <div className="relative z-10 w-full flex items-center justify-center">
          {children}
        </div>
      </div>
    </Portal>
  );
}
