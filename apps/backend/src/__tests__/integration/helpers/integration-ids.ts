import { randomBytes } from 'crypto';

/**
 * Sufijo único para slugs/emails de tenants en pruebas de integración (Jest en paralelo).
 * `randomBytes` evita colisiones cuando varios workers comparten el mismo `Date.now()`.
 */
export function uniqueIntegrationSuffix(): string {
  return `${Date.now()}-${randomBytes(8).toString('hex')}`;
}
