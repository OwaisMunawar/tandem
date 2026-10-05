import { TandemError } from '../../../core/errors/TandemError';
import { isRoomId, normaliseServerUrl } from '../../sync/lib/roomUrl';

export type Invite = {
  roomId: string;
  serverUrl: string;
  householdName: string;
};

const SCHEME = 'tandem';

/**
 * The invite is the whole credential in v0.1: whoever holds the room id can
 * read and write the household. That is why it only travels by QR code or a
 * link the user chooses to share, never through a server-side directory.
 */
export function buildInviteUrl(invite: Invite): string {
  const params = [
    `room=${encodeURIComponent(invite.roomId)}`,
    `server=${encodeURIComponent(invite.serverUrl)}`,
    `name=${encodeURIComponent(invite.householdName)}`,
  ];
  return `${SCHEME}://join?${params.join('&')}`;
}

function readParams(query: string): Map<string, string> {
  const params = new Map<string, string>();
  for (const pair of query.split('&')) {
    const [key, value = ''] = pair.split('=');
    if (!key) continue;
    try {
      params.set(decodeURIComponent(key), decodeURIComponent(value.replace(/\+/g, ' ')));
    } catch {
      // Malformed escapes make the whole invite invalid below.
    }
  }
  return params;
}

export function parseInvite(raw: string): Invite {
  const text = raw.trim();
  const match =
    /^tandem:\/\/(?:\/)?join\/?\?(.+)$/i.exec(text) ??
    /^[a-z+.-]+:\/\/[^?]*\/join\/?\?(.+)$/i.exec(text);
  if (!match?.[1]) throw new TandemError('INVALID_INVITE', 'This is not a Tandem invite.');
  return inviteFromParams(Object.fromEntries(readParams(match[1])));
}

/** Expo Router hands deep-link params over already decoded. */
export function inviteFromParams(params: Record<string, string | string[] | undefined>): Invite {
  const first = (value: string | string[] | undefined) =>
    (Array.isArray(value) ? value[0] : value) ?? '';
  const roomId = first(params.room);
  const serverUrl = normaliseServerUrl(first(params.server));
  if (!isRoomId(roomId))
    throw new TandemError('INVALID_INVITE', 'The invite is missing its household code.');
  if (!serverUrl)
    throw new TandemError('INVALID_INVITE', 'The invite does not say which sync server to use.');
  return { roomId, serverUrl, householdName: first(params.name).slice(0, 60) };
}
