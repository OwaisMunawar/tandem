import { join } from 'node:path';

/**
 * Socket paths look like `/<roomId>`; TinyBase appends a channel, giving
 * server paths `<roomId>/data` and `<roomId>/presence`.
 */
const ROOM_ID = '[A-Za-z0-9_-]{22,64}';
const UPGRADE_PATH = new RegExp(`^/${ROOM_ID}/?$`);
const DATA_PATH = new RegExp(`^(${ROOM_ID})/data$`);
const PRESENCE_PATH = new RegExp(`^${ROOM_ID}/presence$`);

export function isPresencePath(pathId: string): boolean {
  return PRESENCE_PATH.test(pathId);
}

/** Refuses upgrades for anything that is not a well-formed room before TinyBase sees it. */
export function isRoomSocketPath(pathname: string): boolean {
  return UPGRADE_PATH.test(pathname);
}

/**
 * Only the household channel is persisted. Presence is relayed between
 * connected phones and forgotten, which is the point of keeping it separate.
 * The id was validated above, so it is safe to use as a file name.
 */
export function roomFileFor(pathId: string, dataDir: string): string | null {
  const match = DATA_PATH.exec(pathId);
  return match?.[1] ? join(dataDir, `${match[1]}.json`) : null;
}
