/**
 * Permisos y validación en configuración.
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

  const userRepo = AppDataSource.getRepository(Usuario);
  const existing = await userRepo.findOne({ where: { email: 'contador@pos.com' } });
  const hash = await bcrypt.hash('Contador123!', 10);
  if (existing) {
    existing.passwordHash = hash;
    await userRepo.save(existing);
  } else {
    const tenantRow = await AppDataSource.getRepository(Tenant)
      .createQueryBuilder('t')
      .select('t.id', 'id')
      .orderBy('t.id', 'ASC')
      .getRawOne<{ id: number }>();
    if (tenantRow?.id == null) throw new Error('Se esperaba al menos un tenant en BD');
    const tenant = await AppDataSource.getRepository(Tenant).findOneBy({ id: Number(tenantRow.id) });
    if (!tenant) throw new Error('Tenant no encontrado');
    await userRepo.save(
      userRepo.create({
        nombre:       'Contador externo',
        email:        'contador@pos.com',
        passwordHash: hash,
        rol:          'contador',
        tenant,
      }),
    );
  }

  const retry = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'contador@pos.com', password: 'Contador123!' });
  if (retry.status !== 200 || !retry.body?.data?.accessToken) {
    throw new Error(`Login contador tras alta falló: ${retry.status}`);
  }
  return String(retry.body.data.accessToken);
}

const basePayload = {
  nombreCompania: 'Mi Negocio SRL',
  rnc: '132428668',
  simboloMoneda: 'RD$',
  numeroDecimales: 2,
  preciosIncluyenImpuesto: true,
  tasaImpuesto1: 18,
  tasaImpuesto2: 0,
  comprobanteDefecto: '02',
  nombreCaja: 'CAJA 1',
  zonaHoraria: 'America/Santo_Domingo',
};

describe('configuracion — permisos y validación', () => {
  let adminToken = '';
  let cajeroToken = '';
  let contadorToken = '';

  beforeAll(async () => {
    await initDatabaseForTests();
    await redis.connect();

    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@pos.com', password: 'Admin123!' });
    if (adminLogin.status !== 200 || !adminLogin.body?.data?.accessToken) {
      throw new Error(`Login admin falló: ${adminLogin.status}`);
    }
    adminToken = String(adminLogin.body.data.accessToken);

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

  it('PUT con RNC inválido → 400', async () => {
    const res = await request(app)
      .put('/api/v1/configuracion')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...basePayload, rnc: '12345' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('PUT como cajero (no admin) → 403', async () => {
    const res = await request(app)
      .put('/api/v1/configuracion')
      .set('Authorization', `Bearer ${cajeroToken}`)
      .send(basePayload);

    expect(res.status).toBe(403);
  });

  it('POST /configuracion/logotipo como admin → 200 y logotipoUrl', async () => {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );
    const res = await request(app)
      .post('/api/v1/configuracion/logotipo')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('logotipo', png, { filename: 'logo.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.logotipoUrl).toMatch(/^https?:\/\/.+\/uploads\/tenants\/\d+\/logo\.png$/i);
  });

  it('POST /configuracion/logotipo como cajero → 403', async () => {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );
    const res = await request(app)
      .post('/api/v1/configuracion/logotipo')
      .set('Authorization', `Bearer ${cajeroToken}`)
      .attach('logotipo', png, { filename: 'logo.png', contentType: 'image/png' });

    expect(res.status).toBe(403);
  });

  it('PUT como contador → 403', async () => {
    const res = await request(app)
      .put('/api/v1/configuracion')
      .set('Authorization', `Bearer ${contadorToken}`)
      .send(basePayload);

    expect(res.status).toBe(403);
  });

  it('GET /configuracion como contador → 200', async () => {
    const res = await request(app)
      .get('/api/v1/configuracion')
      .set('Authorization', `Bearer ${contadorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data?.nombreCompania).toBeTruthy();
  });

  it('GET /configuracion/fiscal-status como admin → 200 con campos esperados', async () => {
    const res = await request(app)
      .get('/api/v1/configuracion/fiscal-status')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      ok: expect.any(Boolean),
      jurisdiccion: expect.any(String),
      rncConfigured: expect.any(Boolean),
      tasaItbis: expect.any(Number),
    });
  });
});
