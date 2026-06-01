import { initDatabaseForTests } from '../config/database';

initDatabaseForTests()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
