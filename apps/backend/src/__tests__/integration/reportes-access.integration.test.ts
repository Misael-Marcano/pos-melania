/**
 * Permisos de reportes por rol (contador solo lectura; cajero sin acceso).
 * Ejecutar: `npm run test:integration` desde `apps/backend`
 */
import bcrypt from 'bcryptjs';
import request from 'supertest';
import app from '../../app';
import { AppDataSource, initDatabaseForTests } from '../../config/database';
import { redis } from '../../config/redis';
import { Tenant } from '../../entities/Tenant.entity';
import { Usuario } from '../../entities/Usuario.entity';

async function ensureContadorToken(): Promise<string> {
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'contador@pos.com', password: 'Contador123!' });
  if (login.status === 200 && login.body?.data?.accessToken) {
    return String(login.body.data.accessToken);
  }

  const tenantRow = await AppDataSource.getRepository(Tenant)
    .createQueryBuilder('t')
    .select('t.id', 'id')
    .orderBy('t.id', 'ASC')
    .getRawOne<{ id: number }>();
  if (tenantRow?.id == null) throw new Error('Se esperaba al menos un tenant en BD');
  const tenant = await AppDataSource.getRepository(Tenant).findOneBy({ id: Number(tenantRow.id) });
  if (!tenant) throw new Error('Tenant no encontrado');

  const hash = await bcrypt.hash('Contador123!', 10);
  await AppDataSource.getRepository(Usuario).save(
    AppDataSource.getRepository(Usuario).create({
      nombre:       'Contador externo',
      email:        'contador@pos.com',
      passwordHash: hash,
      rol:          'contador',
      tenant,
    }),
  );

  const retry = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'contador@pos.com', password: 'Contador123!' });
  if (retry.status !== 200 || !retry.body?.data?.accessToken) {
    throw new Error(`Login contador tras alta falló: ${retry.status}`);
  }
  return String(retry.body.data.accessToken);
}

function dateRangeQuery() {
  const hasta = new Date().toISOString().split('T')[0];
  const desde = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  return { desde, hasta };
}

describe('reportes — acceso por rol', () => {
  let cajeroToken = '';
  let contadorToken = '';

  beforeAll(async () => {
    await initDatabaseForTests();
    await redis.connect();

    const cajeroLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'cajero@pos.com', password: 'Cajero123!' });
    if (cajeroLogin.status !== 200 || !cajeroLogin.body?.data?.accessToken) {
      throw new Error(`Login cajero falló: ${cajeroLogin.status}`);
    }
    cajeroToken = String(cajeroLogin.body.data.accessToken);
    contadorToken = await ensureContadorToken();
  });

  afterAll(async () => {
    try {
      if (AppDataSource.isInitialized) await AppDataSource.destroy();
    } finally {
      try {
        await redis.quit();
      } catch {
        /* sin conexión previa */
      }
    }
  });

  it('contador GET /reportes/ventas-por-dia → 200', async () => {
    const res = await request(app)
      .get('/api/v1/reportes/ventas-por-dia')
      .query(dateRangeQuery())
      .set('Authorization', `Bearer ${contadorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('cajero GET /reportes/ventas-por-dia → 403', async () => {
    const res = await request(app)
      .get('/api/v1/reportes/ventas-por-dia')
      .query(dateRangeQuery())
      .set('Authorization', `Bearer ${cajeroToken}`);

    expect(res.status).toBe(403);
  });

  it('contador GET /reportes/panel-resumen → 403 (solo dashboard operativo)', async () => {
    const fecha = new Date().toISOString().split('T')[0];
    const res = await request(app)
      .get('/api/v1/reportes/panel-resumen')
      .query({ fecha, dias: 7 })
      .set('Authorization', `Bearer ${contadorToken}`);

    expect(res.status).toBe(403);
  });
});
