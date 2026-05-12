/**
 * Aislamiento multi-tenant en empleados: GET /empleados/:id con JWT de otra org → 404
 * (consulta acotada por tenant; el id no existe en la organizacion del token).
 *
 * Ejecutar: `npm run test:integration` desde `apps/backend`
 */
import request from 'supertest';
import app from '../../app';
import { AppDataSource, initDatabaseForTests } from '../../config/database';
import { redis } from '../../config/redis';
import { Empleado } from '../../entities/Empleado.entity';
import {
  createOtherTenantAdmin,
  deleteOtherTenantUser,
  OtherTenantFixture,
} from './helpers/other-tenant-auth';

describe('empleados - aislamiento por tenant', () => {
  let fixture: OtherTenantFixture;
  let anyEmpleadoId: number | null = null;

  beforeAll(async () => {
    await initDatabaseForTests();
    await redis.connect();

    const row = await AppDataSource.getRepository(Empleado)
      .createQueryBuilder('e')
      .select('e.id', 'id')
      .orderBy('e.id', 'ASC')
      .getRawOne<{ id: number }>();
    anyEmpleadoId = row?.id != null ? Number(row.id) : null;

    fixture = await createOtherTenantAdmin();
  });

  afterAll(async () => {
    try {
      if (AppDataSource.isInitialized && fixture) {
        await deleteOtherTenantUser(fixture);
      }
    } finally {
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
      }
      try {
        await redis.quit();
      } catch {
        /* sin conexión previa */
      }
    }
  });

  it('GET /empleados/:id con token de otra organizacion → 404 si existe un empleado en BD', async () => {
    if (anyEmpleadoId == null) {
      console.warn(
        '[empleados-tenant-isolation] Sin filas en `empleados`: omitido (seed o datos de prueba).',
      );
      return;
    }
    const res = await request(app)
      .get(`/api/v1/empleados/${anyEmpleadoId}`)
      .set('Authorization', `Bearer ${fixture.token}`);
    expect(res.status).toBe(404);
  });
});
