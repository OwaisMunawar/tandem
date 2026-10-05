import { getRandomValues } from 'expo-crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/**
 * URL-safe random id. 22 characters carry 132 bits, which is what makes a
 * household room id unguessable: the server has no other access control in
 * v0.1 (see docs/ARCHITECTURE.md, ADR-004).
 */
export function randomId(length = 22): string {
  const bytes = getRandomValues(new Uint8Array(length));
  let id = '';
  for (const byte of bytes) id += ALPHABET[byte & 63];
  return id;
}

/** Shorter ids for rows. Collisions only matter within one household. */
export function rowId(): string {
  return randomId(12);
}
