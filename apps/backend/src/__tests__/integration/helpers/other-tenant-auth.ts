/**
 * Crea un segundo tenant + usuario admin y devuelve JWT para pruebas de aislamiento multi-tenant.
 * El caller debe haber llamado a `initDatabaseForTests()` antes.
 */
import bcrypt from 'bcryptjs';
import request from 'supertest';
import app from '../../../app';
import { AppDataSource } from '../../../config/database';
import { Tenant } from '../../../entities/Tenant.entity';
import { Usuario } from '../../../entities/Usuario.entity';

export interface OtherTenantFixture {
  token:    string;
  userId:   number;
  tenantId: number;
}

export async function createOtherTenantAdmin(): Promise<OtherTenantFixture> {
  const ts = Date.now();
  const tenantRepo = AppDataSource.getRepository(Tenant);
  const userRepo = AppDataSource.getRepository(Usuario);

  const t2 = await tenantRepo.save(
    tenantRepo.create({
      nombre:   `Org aislamiento ${ts}`,
      slug:     `org-aisl-${ts}`,
      activo:   true,
      planCode: 'standard',
    }),
  );

  const hash = await bcrypt.hash('Test1234!', 10);
  const u2 = await userRepo.save(
    userRepo.create({
      nombre:       'Admin otra org',
      email:        `admin-otra-${ts}@example.com`,
      passwordHash: hash,
      rol:          'admin',
      tenant:       t2,
    }),
  );

  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: `admin-otra-${ts}@example.com`, password: 'Test1234!' });
  if (login.status !== 200 || !login.body?.data?.accessToken) {
    throw new Error(`Login usuario otra org falló: ${login.status} ${JSON.stringify(login.body)}`);
  }

  return {
    token:    String(login.body.data.accessToken),
    userId:   u2.id,
    tenantId: t2.id,
  };
}

export async function deleteOtherTenantUser(f: OtherTenantFixture): Promise<void> {
  await AppDataSource.getRepository(Usuario).delete({ id: f.userId });
  await AppDataSource.getRepository(Tenant).delete({ id: f.tenantId });
}
