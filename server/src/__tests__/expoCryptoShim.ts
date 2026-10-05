// The app's id helper uses expo-crypto; in plain Node the same bytes come from node:crypto.
import { randomFillSync, randomUUID } from 'node:crypto';

export const getRandomValues = <T extends Uint8Array>(array: T): T => randomFillSync(array);
export { randomUUID };
