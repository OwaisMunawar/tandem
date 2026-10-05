/** Room ids are 22+ URL-safe characters; anything else is refused by the server too. */
export const ROOM_ID_PATTERN = /^[A-Za-z0-9_-]{22,64}$/;

export function isRoomId(value: string): boolean {
  return ROOM_ID_PATTERN.test(value);
}

export function normaliseServerUrl(raw: string): string | null {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return null;
  const withScheme = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `ws://${trimmed}`;
  const match = /^(wss?|https?):\/\/([^/\s?#]+)(\/[^\s?#]*)?$/i.exec(withScheme);
  if (!match?.[1] || !match[2]) return null;
  const scheme = match[1].toLowerCase().replace(/^http/, 'ws');
  return `${scheme}://${match[2]}${match[3] ?? ''}`;
}

/** The household's socket URL: one path per room, channels are appended by TinyBase. */
export function roomSocketUrl(serverUrl: string, roomId: string): string {
  return `${serverUrl.replace(/\/+$/, '')}/${roomId}`;
}

/** HTTP base of the same server, used for the optional LLM quick-add endpoint. */
export function httpBaseUrl(serverUrl: string): string {
  return serverUrl.replace(/^ws(s?):\/\//i, 'http$1://').replace(/\/+$/, '');
}
