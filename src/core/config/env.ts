/**
 * Build-time flags. Expo inlines EXPO_PUBLIC_* when bundling, so these cannot
 * change at runtime and are safe to read at module scope.
 */
export const IS_DEMO = process.env.EXPO_PUBLIC_DEMO === '1';

/** Sync server for newly created households. Empty means local-only. */
export const DEFAULT_SYNC_URL = process.env.EXPO_PUBLIC_SYNC_URL ?? '';
