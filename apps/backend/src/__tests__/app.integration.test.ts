import request from 'supertest';

// setup-env se carga vía jest.config setupFiles
import app from '../app';

describe('API HTTP (sin BD)', () => {
  it('GET /health responde 200 y expone X-Request-Id', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
    expect(res.headers['x-request-id']).toBeDefined();
    expect(typeof res.headers['x-request-id']).toBe('string');
  });

  it('GET /api/v1/xyz ruta inexistente → 404 JSON', async () => {
    const res = await request(app).get('/api/v1/ruta-que-no-existe-xyz');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
