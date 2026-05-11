import 'reflect-metadata';
import bcrypt from 'bcryptjs';
import { AppDataSource } from '../config/database';
import { Usuario } from '../entities/Usuario.entity';
import { Configuracion } from '../entities/Configuracion.entity';
import { Comprobante } from '../entities/Comprobante.entity';
import { Tienda } from '../entities/Tienda.entity';
import { Tenant } from '../entities/Tenant.entity';

async function seed() {
  await AppDataSource.initialize();
  console.log('🌱 Ejecutando seed...');

  const usuarioRepo      = AppDataSource.getRepository(Usuario);
  const configRepo       = AppDataSource.getRepository(Configuracion);
  const comprobanteRepo  = AppDataSource.getRepository(Comprobante);
  const tiendaRepo       = AppDataSource.getRepository(Tienda);
  const tenantRepo       = AppDataSource.getRepository(Tenant);

  let tenantDefault = await tenantRepo.findOne({ where: { slug: 'default' } });
  if (!tenantDefault) {
    tenantDefault = await tenantRepo.save(
      tenantRepo.create({ nombre: 'Organización por defecto', slug: 'default', activo: true }),
    );
  }

  // ── Usuarios por rol ──────────────────────────────────────────────────────
  const usuarios = [
    { nombre: 'Administrador',      email: 'admin@pos.com',                 password: 'Admin123!',    rol: 'admin'    as const },
    { nombre: 'Cajero Principal',   email: 'cajero@pos.com',                password: 'Cajero123!',   rol: 'cajero'   as const },
    { nombre: 'Soporte Técnico',    email: 'soporte@wilmaxdigital.com',      password: 'Soporte123!',  rol: 'soporte'  as const },
    { nombre: 'Plataforma',         email: 'plataforma@pos.com',             password: 'Plataforma123!', rol: 'plataforma' as const },
  ];

  for (const u of usuarios) {
    const existe = await usuarioRepo.findOne({ where: { email: u.email } });
    if (!existe) {
      const hash = await bcrypt.hash(u.password, 10);
      await usuarioRepo.save(usuarioRepo.create({
        nombre: u.nombre, email: u.email, passwordHash: hash, rol: u.rol,
        tenant: tenantDefault,
      }));
      console.log(`  ✅ Usuario creado: ${u.email} (${u.rol})`);
    } else {
      console.log(`  ⏭️  Usuario ya existe: ${u.email}`);
    }
  }

  // ── Configuración inicial ─────────────────────────────────────────────────
  const cfgExiste = await configRepo.findOne({ where: { tenant: { id: tenantDefault.id } } });
  if (!cfgExiste) {
    await configRepo.save(configRepo.create({
      tenant:                  tenantDefault,
      nombreCompania:          'Mi empresa (demo)',
      rnc:                     '132428668',
      simboloMoneda:           'RDS',
      numeroDecimales:         2,
      preciosIncluyenImpuesto: true,
      tasaImpuesto1Nombre:     'ITBIS',
      tasaImpuesto1:           0,
      comprobanteDefecto:      '02',
    }));
    console.log('  ✅ Configuración inicial creada');
  }

  // ── Comprobantes NCF DGII ─────────────────────────────────────────────────
  const comprobantes = [
    { descripcion: 'FACTURA DE CRÉDITO FISCAL',     series: 'B', tipo: '01' as const, desde: '00000115', hasta: '00000198', secuenciaActual: 'B0100000115' },
    { descripcion: 'FACTURA DE CONSUMO',             series: 'B', tipo: '02' as const, desde: '00012501', hasta: '00022500', secuenciaActual: 'B0200012501' },
    { descripcion: 'NOTA DE CRÉDITO',                series: 'B', tipo: '04' as const, desde: '00000001', hasta: '00000050', secuenciaActual: 'B0400000001' },
    { descripcion: 'FACTURA GUBERNAMENTAL',          series: 'B', tipo: '15' as const, desde: '00000001', hasta: '00000100', secuenciaActual: 'B1500000001' },
    { descripcion: 'RÉGIMEN ESPECIAL DE TRIBUTACIÓN', series: 'B', tipo: '14' as const, desde: '00000001', hasta: '00000015', secuenciaActual: 'B1400000001' },
  ];

  for (const c of comprobantes) {
    const existe = await comprobanteRepo.findOne({ where: { tipo: c.tipo } });
    if (!existe) {
      await comprobanteRepo.save(comprobanteRepo.create({ ...c, tenant: tenantDefault }));
      console.log(`  ✅ Comprobante ${c.tipo} creado`);
    }
  }

  // ── Tienda principal ──────────────────────────────────────────────────────
  const tiendaExiste = await tiendaRepo.findOne({ where: {} });
  if (!tiendaExiste) {
    await tiendaRepo.save(tiendaRepo.create({
      nombre:    'PRINCIPAL',
      direccion: 'EL EJIDO, CALLE 15 NUMERO 26, SANTIAGO DE LOS CABALLEROS.',
      telefono:  '809 583 1012',
      tenant:    tenantDefault,
    }));
    console.log('  ✅ Tienda principal creada');
  }

  console.log('\n🎉 Seed completado');
  console.log('\n📋 Credenciales:');
  console.log('   Admin   → admin@pos.com         / Admin123!');
  console.log('   Cajero  → cajero@pos.com         / Cajero123!');
  console.log('   Soporte → soporte@wilmaxdigital.com / Soporte123!');

  await AppDataSource.destroy();
}

seed().catch((e) => { console.error(e); process.exit(1); });
