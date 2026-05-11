import { env } from './config/env';
import { initDatabase } from './config/database';
import { redis } from './config/redis';
import app from './app';

const start = async () => {
  await initDatabase();
  await redis.connect();

  const server = app.listen(Number(env.PORT), () => {
    const swaggerOn =
      process.env.NODE_ENV !== 'production' || process.env.SWAGGER_ENABLED === 'true';
    console.log(`\n🚀 Servidor corriendo en http://localhost:${env.PORT}`);
    console.log(`   Ambiente : ${env.NODE_ENV}`);
    console.log(`   API Base : http://localhost:${env.PORT}/api/v1`);
    if (swaggerOn) {
      console.log(`   Swagger  : http://localhost:${env.PORT}/api-docs\n`);
    } else {
      console.log('');
    }
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n⚡ ${signal} recibido — cerrando servidor...`);
    server.close(async () => {
      await redis.quit();
      console.log('✅ Servidor cerrado');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
};

start().catch((e) => {
  console.error('❌ Error al iniciar servidor:', e);
  process.exit(1);
});
