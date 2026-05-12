'use client';

import { Slide, ToastContainer, type CloseButtonProps, type IconProps } from 'react-toastify';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

function PosToastClose({ closeToast }: CloseButtonProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        closeToast(e);
      }}
      className="Toastify__close-button Toastify__close-button--light pos-toast-close-inner"
      aria-label="Cerrar notificación"
    >
      <X size={16} strokeWidth={2.25} aria-hidden className="pointer-events-none" />
    </button>
  );
}

function PosToastIcon({ type }: IconProps) {
  const common = 'shrink-0';
  switch (type) {
    case 'success':
      return <CheckCircle2 className={`${common} text-primary-600`} size={20} strokeWidth={2.25} aria-hidden />;
    case 'error':
      return <XCircle className={`${common} text-rose-600`} size={20} strokeWidth={2.25} aria-hidden />;
    case 'warning':
      return <AlertTriangle className={`${common} text-amber-600`} size={20} strokeWidth={2.25} aria-hidden />;
    case 'info':
      return <Info className="shrink-0 text-secondary" size={20} strokeWidth={2.25} aria-hidden />;
    default:
      return <Info className="shrink-0 text-navy-500" size={20} strokeWidth={2.25} aria-hidden />;
  }
}

export function Toaster() {
  return (
    <ToastContainer
      position="top-right"
      autoClose={4500}
      transition={Slide}
      hideProgressBar={false}
      newestOnTop
      closeOnClick={false}
      closeButton={PosToastClose}
      pauseOnFocusLoss={false}
      draggable
      draggablePercent={60}
      pauseOnHover
      limit={5}
      theme="light"
      icon={PosToastIcon}
      className="pos-toast-container"
      toastClassName="pos-toast-item"
    />
  );
}
