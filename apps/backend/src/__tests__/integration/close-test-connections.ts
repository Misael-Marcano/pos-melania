import { AppDataSource } from '../../config/database';
import { redis } from '../../config/redis';

/** Cierra pool TypeORM y cliente Redis tras suites de integración. */
export async function closeTestConnections(): Promise<void> {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  try {
    redis.removeAllListeners();
    const status = redis.status;
    if (status === 'ready' || status === 'connecting' || status === 'connect' || status === 'reconnecting') {
      await redis.quit();
    }
  } catch {
    try {
      redis.disconnect();
    } catch {
      /* ignore */
    }
  }
}
