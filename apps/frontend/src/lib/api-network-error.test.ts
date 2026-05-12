import type { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';

import { messageForAxiosNoResponse } from './api-network-error';

function err(partial: Partial<AxiosError> & { message?: string }): AxiosError {
  return partial as AxiosError;
}

describe('messageForAxiosNoResponse', () => {
  it('maps ECONNABORTED to timeout message', () => {
    expect(
      messageForAxiosNoResponse(
        err({ code: 'ECONNABORTED', message: 'timeout of 5000ms exceeded' }),
      ),
    ).toBe('Tiempo de espera agotado. Reintenta y comprueba tu conexión o VPN.');
  });

  it('maps ERR_NETWORK', () => {
    expect(messageForAxiosNoResponse(err({ code: 'ERR_NETWORK', message: 'Network Error' }))).toBe(
      'Error de red. Comprueba conexión, VPN o firewall y reintenta.',
    );
  });

  it('maps ERR_CANCELED', () => {
    expect(messageForAxiosNoResponse(err({ code: 'ERR_CANCELED', message: 'canceled' }))).toBe(
      'Petición cancelada. Vuelve a intentarlo si hace falta.',
    );
  });

  it('maps ECONNREFUSED in message', () => {
    expect(
      messageForAxiosNoResponse(err({ message: 'connect ECONNREFUSED 127.0.0.1:4000' })),
    ).toBe('No se pudo conectar al servidor. Comprueba que el API esté en marcha y el puerto.');
  });

  it('returns generic when nothing matches', () => {
    expect(messageForAxiosNoResponse(err({ code: 'FOO', message: 'something else' }))).toBe(
      'Sin respuesta del servidor. Comprueba que el API esté activo, la URL configurada y tu red.',
    );
  });
});
