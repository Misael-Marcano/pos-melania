import { toast as rtToast } from 'react-toastify';

// Misma API que antes — ningún hook ni página necesita cambios
export const toast = {
  success: (message: string) => rtToast.success(message),
  error:   (message: string) => rtToast.error(message),
  info:    (message: string) => rtToast.info(message),
  warning: (message: string) => rtToast.warning(message),
};
