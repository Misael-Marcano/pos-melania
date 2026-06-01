/**
 * POST /api/v1/tenants/:id/operate — auditoría al entrar en contexto de una org (rol plataforma).
 */
import request from 'supertest';
import app from '../../app';
import { AppDataSource, initDatabaseForTests } from '../../config/database';
import { redis } from '../../config/redis';
import { AuditLog } from '../../entities/AuditLog.entity';
import { Tenant } from '../../entities/Tenant.entity';

const PLATAFORMA_EMAIL = 'plataforma@pos.com';
const PLATAFORMA_PASS = 'Plataforma123!';

describe('POST /api/v1/tenants/:id/operate', () => {
  let token: string;
  let targetTenantId: number;

  beforeAll(async () => {
    await initDatabaseForTests();
    await redis.connect();

    const row = await AppDataSource.getRepository(Tenant)
      .createQueryBuilder('t')
      .select('t.id', 'id')
      .orderBy('t.id', 'ASC')
      .getRawOne<{ id: number }>();
    if (row?.id == null) throw new Error('Se esperaba al menos un tenant en BD (seed)');
    targetTenantId = Number(row.id);

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: PLATAFORMA_EMAIL, password: PLATAFORMA_PASS });
    if (login.status !== 200) {
      throw new Error(`Login plataforma falló: ${login.status} ${JSON.stringify(login.body)}`);
    }
    token = String(login.body.data.accessToken);
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

  it('registra fila en audit_logs y devuelve id/nombre', async () => {
    const res = await request(app)
      .post(`/api/v1/tenants/${targetTenantId}/operate`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ id: targetTenantId, nombre: expect.any(String) });

    const logs = await AppDataSource.getRepository(AuditLog).find({
      where: { tabla: 'tenants', registroId: targetTenantId, operacion: 'READ' },
      order: { id: 'DESC' },
      take: 1,
    });
    const log = logs[0];
    expect(log).toBeDefined();
    expect(log?.descripcion).toMatch(/operó en contexto/i);
  });

  it('admin de org → 403', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@pos.com', password: 'Admin123!' });
    expect(login.status).toBe(200);

    const res = await request(app)
      .post(`/api/v1/tenants/${targetTenantId}/operate`)
      .set('Authorization', `Bearer ${login.body.data.accessToken}`);

    expect(res.status).toBe(403);
  });

  it('id inexistente → 404', async () => {
    const res = await request(app)
      .post('/api/v1/tenants/999999999/operate')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
