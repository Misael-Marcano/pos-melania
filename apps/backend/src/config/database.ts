import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from './env';

// Conexión temporal a master para crear la BD si no existe
const masterSource = new DataSource({
  type: 'mssql',
  host: env.DB_HOST,
  port: Number(env.DB_PORT),
  username: env.DB_USER,
  password: env.DB_PASS,
  database: 'master',
  synchronize: false,
  logging: false,
  entities: [],
  options: { encrypt: false, trustServerCertificate: true },
});

export const AppDataSource = new DataSource({
  type: 'mssql',
  host: env.DB_HOST,
  port: Number(env.DB_PORT),
  username: env.DB_USER,
  password: env.DB_PASS,
  database: env.DB_NAME,
  synchronize: false,
  logging: env.NODE_ENV === 'development',
  entities: [__dirname + '/../entities/*.entity.{ts,js}'],
  migrations: [__dirname + '/../migrations/*.{ts,js}'],
  options: {
    encrypt: false,             // true si usas Azure SQL
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    acquireTimeoutMillis: 30000,
  },
});

/**
 * Conecta a SQL Server, crea la BD si no existe y aplica migraciones.
 * Reutilizable en tests (sin `process.exit`); idempotente si `AppDataSource` ya está inicializado.
 */
export async function initDatabaseForTests(): Promise<void> {
  if (AppDataSource.isInitialized) return;

  await masterSource.initialize();
  try {
    await masterSource.query(
      `IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = '${env.DB_NAME}')
       CREATE DATABASE [${env.DB_NAME}]`
    );
  } finally {
    try {
      await masterSource.destroy();
    } catch {
      /* ignore */
    }
  }

  await AppDataSource.initialize();
  if (process.env.NODE_ENV !== 'test') {
    console.log('✅ SQL Server conectado');
  }

  const applied = await AppDataSource.runMigrations();
  if (applied.length > 0 && process.env.NODE_ENV !== 'test') {
    console.log(`✅ ${applied.length} migración(es) aplicada(s)`);
  }
}

export const initDatabase = async (): Promise<void> => {
  try {
    await initDatabaseForTests();
  } catch (error) {
    console.error('❌ Error conectando a SQL Server:', error);
    process.exit(1);
  }
};
