import { toast as rtToast, type ToastOptions } from 'react-toastify';

/** Éxito: breve. Errores: más tiempo para leer o copiar el mensaje. */
const DUR: Record<'success' | 'error' | 'info' | 'warning', ToastOptions> = {
  success: { autoClose: 3200 },
  error:   { autoClose: 9000 },
  info:    { autoClose: 5000 },
  warning: { autoClose: 6000 },
};

// Misma firma que antes — ningún hook ni página necesita cambios
export const toast = {
  success: (message: string) => rtToast.success(message, DUR.success),
  error:   (message: string) => rtToast.error(message, DUR.error),
  info:    (message: string) => rtToast.info(message, DUR.info),
  warning: (message: string) => rtToast.warning(message, DUR.warning),
};
