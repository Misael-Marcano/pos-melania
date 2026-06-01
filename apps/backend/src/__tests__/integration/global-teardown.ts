import { closeTestConnections } from './close-test-connections';

export default async function globalTeardown(): Promise<void> {
  await closeTestConnections();
}
