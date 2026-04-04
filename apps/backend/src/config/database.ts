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

export const initDatabase = async (): Promise<void> => {
  try {
    // 1. Crear la base de datos si no existe
    await masterSource.initialize();
    await masterSource.query(
      `IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = '${env.DB_NAME}')
       CREATE DATABASE [${env.DB_NAME}]`
    );
    await masterSource.destroy();

    // 2. Conectar a la base de datos de la aplicación
    await AppDataSource.initialize();
    console.log('✅ SQL Server conectado');

    // 3. Ejecutar migraciones pendientes
    const applied = await AppDataSource.runMigrations();
    if (applied.length > 0) {
      console.log(`✅ ${applied.length} migración(es) aplicada(s)`);
    }
  } catch (error) {
    console.error('❌ Error conectando a SQL Server:', error);
    process.exit(1);
  }
};
