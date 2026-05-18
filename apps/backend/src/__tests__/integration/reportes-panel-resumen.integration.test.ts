/**
 * GET /api/v1/reportes/panel-resumen — contrato agregado para `/panel`.
 * Requiere SQL Server + Redis + seed (admin@pos.com).
 */
import request from 'supertest';
import app from '../../app';
import { initDatabaseForTests } from '../../config/database';
import { redis } from '../../config/redis';

const ADMIN_EMAIL = 'admin@pos.com';
const ADMIN_PASS = 'Admin123!';

describe('GET /api/v1/reportes/panel-resumen', () => {
  let token: string;

  beforeAll(async () => {
    await initDatabaseForTests();
    await redis.connect();

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASS });
    if (login.status !== 200) {
      throw new Error(`Login admin falló: ${login.status} ${JSON.stringify(login.body)}`);
    }
    token = String(login.body.data.accessToken);
  });

  afterAll(async () => {
    try {
      await redis.quit();
    } catch {
      /* sin conexion previa */
    }
  });

  it('devuelve resumen, ventasPorDia, stockBajo y cartera', async () => {
    const fecha = new Date().toISOString().split('T')[0];
    const res = await request(app)
      .get('/api/v1/reportes/panel-resumen')
      .query({ fecha, dias: 7 })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(data.fecha).toBe(fecha);
    expect(data.resumen).toMatchObject({
      totalTransacciones: expect.any(Number),
      totalVentas:        expect.any(Number),
      totalEfectivo:      expect.any(Number),
      totalGastos:        expect.any(Number),
    });
    expect(data.resumenAnterior).toMatchObject({
      totalTransacciones: expect.any(Number),
      totalVentas:        expect.any(Number),
    });
    expect(Array.isArray(data.ventasPorDia)).toBe(true);
    expect(data.stockBajo).toMatchObject({
      count: expect.any(Number),
      items: expect.any(Array),
    });
    expect(data.cartera).toMatchObject({
      clientesConSaldo: expect.any(Number),
      totalDeuda:       expect.any(Number),
      clientes:         expect.any(Array),
    });
  });
});
