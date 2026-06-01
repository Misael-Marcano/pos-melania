import { z } from 'zod';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
dotenv.config();

// En integración (Jest) queremos poder apuntar a SQL Server del contenedor Docker
// sin tocar la configuración de desarrollo/producción. Por eso:
// - Permitimos overrides explícitos con `INTEGRATION_DB_*`.
// - Si `DB_HOST` viene con `host\instance` (Windows SQL Server instances) y no
//   hay override de integración, recortamos a `host` para evitar dependencia
//   del "instance name" que no existe en el contenedor.
const isIntegrationTest = process.env.NODE_ENV === 'test';
if (isIntegrationTest) {
  const integrationOverrides: Record<'DB_HOST' | 'DB_PORT' | 'DB_USER' | 'DB_PASS' | 'DB_NAME', string> = {
    DB_HOST: 'INTEGRATION_DB_HOST',
    DB_PORT: 'INTEGRATION_DB_PORT',
    DB_USER: 'INTEGRATION_DB_USER',
    DB_PASS: 'INTEGRATION_DB_PASS',
    DB_NAME: 'INTEGRATION_DB_NAME',
  };

  for (const [baseKey, integrationKey] of Object.entries(integrationOverrides)) {
    const value = process.env[integrationKey];
    if (value && value.trim().length > 0) {
      process.env[baseKey] = value;
    }
  }

  const integrationHostProvided = !!process.env.INTEGRATION_DB_HOST;
  if (!integrationHostProvided && process.env.DB_HOST && process.env.DB_HOST.includes('\\')) {
    // Caso típico: SQL Server local en Windows configurado como `MSI\INSTANCE`.
    // Para ejecutar integración contra Docker (puerto 1433 expuesto al host),
    // preferimos los defaults del `docker-compose.yml` para evitar:
    // - dependencia de "instance name"
    // - desajuste de contraseña (`SA_PASSWORD` del contenedor)
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = process.env.DB_PORT && process.env.DB_PORT.trim() ? process.env.DB_PORT : '1433';
    process.env.DB_USER = process.env.DB_USER && process.env.DB_USER.trim() ? process.env.DB_USER : 'sa';

    if (!process.env.INTEGRATION_DB_PASS) {
      const composePath = path.resolve(__dirname, '../../../../docker-compose.yml');
      try {
        const compose = fs.readFileSync(composePath, 'utf8');
        const m = compose.match(/SA_PASSWORD\s*=\s*([^\r\n]+)/i);
        const saPassword = (m?.[1] ?? '').trim().replace(/^['"]|['"]$/g, '');
        if (saPassword) process.env.DB_PASS = saPassword;
      } catch {
        // Si no existe el compose o no se puede leer, mantenemos el DB_PASS actual.
      }
    }
  }

  // Paridad con CI (reduce dependencia del `.env` local).
  if (!process.env.BILLING_PROVIDER) process.env.BILLING_PROVIDER = 'none';
  if (!process.env.FISCAL_JURISDICTION) process.env.FISCAL_JURISDICTION = 'NONE';

  // Jest unit/integration sin `.env` (p. ej. job CI sin variables de BD).
  if (!process.env.DB_HOST?.trim()) process.env.DB_HOST = 'localhost';
  if (!process.env.DB_PORT?.trim()) process.env.DB_PORT = '1433';
  if (!process.env.DB_USER?.trim()) process.env.DB_USER = 'sa';
  if (!process.env.DB_PASS?.trim()) process.env.DB_PASS = 'test_db_pass';
  if (!process.env.DB_NAME?.trim()) process.env.DB_NAME = 'pos_test';
  if (!process.env.JWT_SECRET?.trim()) process.env.JWT_SECRET = 'test_jwt_secret_at_least_16chars';
  if (!process.env.JWT_REFRESH_SECRET?.trim()) {
    process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_at_least_16chars';
  }
}

const envSchema = z.object({
  PORT: z.string().default('4000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // SQL Server
  DB_HOST: z.string().min(1),
  DB_PORT: z.string().default('1433'),
  DB_USER: z.string().min(1),
  DB_PASS: z.string().min(1),
  DB_NAME: z.string().min(1),

  // JWT
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('8h'),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  /**
   * Si `true` o `1`, `POST /auth/login` exige cabecera `X-Tenant-Slug` (despliegue multi-org estricto).
   */
  LOGIN_REQUIRE_TENANT_SLUG: z.string().default('false'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
