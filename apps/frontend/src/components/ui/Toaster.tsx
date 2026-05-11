'use client';

import { ToastContainer, type IconProps } from 'react-toastify';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

function PosToastIcon({ type }: IconProps) {
  const common = 'shrink-0';
  switch (type) {
    case 'success':
      return <CheckCircle2 className={`${common} text-primary-600`} size={22} strokeWidth={2} aria-hidden />;
    case 'error':
      return <XCircle className={`${common} text-rose-500`} size={22} strokeWidth={2} aria-hidden />;
    case 'warning':
      return <AlertTriangle className={`${common} text-amber-500`} size={22} strokeWidth={2} aria-hidden />;
    case 'info':
      return <Info className="shrink-0 text-secondary" size={22} strokeWidth={2} aria-hidden />;
    default:
      return <Info className="shrink-0 text-navy-500" size={22} strokeWidth={2} aria-hidden />;
  }
}

export function Toaster() {
  return (
    <ToastContainer
      position="top-right"
      autoClose={4000}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      pauseOnFocusLoss={false}
      draggable
      pauseOnHover
      limit={5}
      theme="light"
      icon={PosToastIcon}
      className="pos-toast-container"
      toastClassName="pos-toast-item"
    />
  );
}
