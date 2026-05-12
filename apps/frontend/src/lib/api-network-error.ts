import type { AxiosError } from 'axios';

/** Petición sin `response` (red, timeout, CORS, servidor caído, etc.). */
export function messageForAxiosNoResponse(err: AxiosError): string {
  if (isTimeoutLike(err)) {
    return 'Tiempo de espera agotado. Reintenta y comprueba tu conexión o VPN.';
  }
  if (err.code === 'ERR_CANCELED') {
    return 'Petición cancelada. Vuelve a intentarlo si hace falta.';
  }
  if (err.code === 'ERR_NETWORK') {
    return 'Error de red. Comprueba conexión, VPN o firewall y reintenta.';
  }
  const msg = err.message?.toLowerCase() ?? '';
  if (msg.includes('network error')) {
    return 'Error de red. Comprueba conexión, VPN o firewall y reintenta.';
  }
  if (msg.includes('econnrefused') || msg.includes('connection refused')) {
    return 'No se pudo conectar al servidor. Comprueba que el API esté en marcha y el puerto.';
  }
  return 'Sin respuesta del servidor. Comprueba que el API esté activo, la URL configurada y tu red.';
}

function isTimeoutLike(err: AxiosError): boolean {
  if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') return true;
  const m = err.message?.toLowerCase() ?? '';
  return m.includes('timeout') || m.includes('timed out');
}
