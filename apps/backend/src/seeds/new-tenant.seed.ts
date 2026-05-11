/**
 * Script de provisioning — crea un nuevo tenant con su primer admin.
 *
 * Uso:
 *   cd apps/backend
 *   TENANT_NOMBRE="Ferretería ABC" \
 *   TENANT_SLUG="ferreteria-abc" \
 *   ADMIN_EMAIL="admin@ferreteria-abc.com" \
 *   ADMIN_PASSWORD="CambiarEsto123!" \
 *   ts-node src/seeds/new-tenant.seed.ts
 *
 * Variables de entorno requeridas (además de DB_* y JWT_*):
 *   TENANT_NOMBRE   — Nombre de la organización
 *   TENANT_SLUG     — Identificador único (solo letras minúsculas, números y guiones)
 *   ADMIN_EMAIL     — Email del primer administrador
 *   ADMIN_PASSWORD  — Contraseña (mín. 8 chars, 1 mayúscula, 1 número)
 *
 * Opcionales:
 *   PLAN_CODE       — starter | standard | enterprise  (default: standard)
 *   ADMIN_NOMBRE    — Nombre visible del admin          (default: Admin)
 *   TRIAL_DAYS      — Si es un número > 0, fija `trialEndsAt` a hoy + N días (periodo de prueba)
 */
import 'reflect-metadata';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '../config/database';
import { Tenant } from '../entities/Tenant.entity';
import { Usuario } from '../entities/Usuario.entity';

async function main() {
  const nombre    = process.env.TENANT_NOMBRE?.trim();
  const slug      = process.env.TENANT_SLUG?.trim().toLowerCase();
  const email     = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password  = process.env.ADMIN_PASSWORD?.trim();
  const planCode  = (process.env.PLAN_CODE?.trim() ?? 'standard').toLowerCase();
  const adminNombre = process.env.ADMIN_NOMBRE?.trim() ?? 'Admin';

  if (!nombre || !slug || !email || !password) {
    console.error('❌ Faltan variables: TENANT_NOMBRE, TENANT_SLUG, ADMIN_EMAIL, ADMIN_PASSWORD');
    process.exit(1);
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    console.error('❌ TENANT_SLUG solo puede contener letras minúsculas, números y guiones.');
    process.exit(1);
  }

  if (!['starter', 'standard', 'enterprise'].includes(planCode)) {
    console.error('❌ PLAN_CODE debe ser starter, standard o enterprise.');
    process.exit(1);
  }

  await AppDataSource.initialize();
  console.log('✅ Base de datos conectada');

  const tenantRepo  = AppDataSource.getRepository(Tenant);
  const usuarioRepo = AppDataSource.getRepository(Usuario);

  // Verificar que el slug no exista
  const existing = await tenantRepo.findOne({ where: { slug } });
  if (existing) {
    console.error(`❌ Ya existe una organización con el slug "${slug}" (id=${existing.id}).`);
    await AppDataSource.destroy();
    process.exit(1);
  }

  // Verificar que el email no exista
  const existingUser = await usuarioRepo.findOne({ where: { email } });
  if (existingUser) {
    console.error(`❌ Ya existe un usuario con el email "${email}".`);
    await AppDataSource.destroy();
    process.exit(1);
  }

  const trialDaysRaw = process.env.TRIAL_DAYS?.trim();
  let trialEndsAt: Date | undefined;
  if (trialDaysRaw && !Number.isNaN(Number(trialDaysRaw))) {
    const n = Number(trialDaysRaw);
    if (n > 0) {
      const d = new Date();
      d.setDate(d.getDate() + n);
      trialEndsAt = d;
    }
  }

  // Crear tenant
  const tenant = tenantRepo.create({
    nombre,
    slug,
    planCode,
    activo: true,
    ...(trialEndsAt ? { trialEndsAt } : {}),
  });
  await tenantRepo.save(tenant);
  console.log(`✅ Tenant creado: "${nombre}" (id=${tenant.id}, slug=${slug}, plan=${planCode}${trialEndsAt ? `, trial hasta ${trialEndsAt.toISOString()}` : ''})`);

  // Crear primer admin
  const passwordHash = await bcrypt.hash(password, 10);
  const admin = usuarioRepo.create({
    nombre:       adminNombre,
    email,
    passwordHash,
    rol:          'admin',
    activo:       true,
    tenant,
  });
  await usuarioRepo.save(admin);
  console.log(`✅ Admin creado: ${adminNombre} <${email}> (id=${admin.id})`);

  console.log('\n──────────────────────────────────────────');
  console.log('  Organización aprovisionada correctamente');
  console.log(`  Tenant ID : ${tenant.id}`);
  console.log(`  Slug      : ${slug}`);
  console.log(`  Plan      : ${planCode}`);
  console.log(`  Admin     : ${email}`);
  console.log('──────────────────────────────────────────\n');

  await AppDataSource.destroy();
  process.exit(0);
}

main().catch((e) => {
  console.error('❌ Error en provisioning:', e);
  process.exit(1);
});
