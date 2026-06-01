/** Tests contra SQL Server + Redis (misma `.env` que desarrollo). Ver `package.json` → test:integration */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/src/__tests__/setup-env.ts'],
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/integration/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  clearMocks: true,
  testTimeout: 120_000,
  maxWorkers: 1,
  // Pool SQL Server + ioredis pueden dejar handles; el teardown global de Jest corre en otro proceso.
  globalTeardown: '<rootDir>/src/__tests__/integration/global-teardown.ts',
  forceExit: true,
};
