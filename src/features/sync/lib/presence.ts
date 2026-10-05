/**
 * Presence is derived from heartbeats in the ephemeral presence document.
 * A device counts as online while its heartbeat is fresher than the TTL.
 *
 * Clocks differ between phones; the TTL is three heartbeats wide so a
 * device whose clock runs a few seconds behind does not flicker offline.
 */
export const HEARTBEAT_MS = 10_000;
export const PRESENCE_TTL_MS = HEARTBEAT_MS * 3;

export type DeviceHeartbeat = {
  memberId: string;
  lastSeen: number;
  editing: string;
};

export type MemberPresence = { online: boolean; editing: string[] };

export function memberPresence(
  devices: Readonly<Record<string, DeviceHeartbeat>>,
  now: number,
  excludeDeviceId?: string,
): Map<string, MemberPresence> {
  const result = new Map<string, MemberPresence>();
  for (const [deviceId, device] of Object.entries(devices)) {
    if (deviceId === excludeDeviceId || !device.memberId) continue;
    const online = now - device.lastSeen <= PRESENCE_TTL_MS;
    const current = result.get(device.memberId) ?? { online: false, editing: [] };
    current.online ||= online;
    if (online && device.editing && !current.editing.includes(device.editing)) {
      current.editing.push(device.editing);
    }
    result.set(device.memberId, current);
  }
  return result;
}

/** Members (other than this device) currently editing `targetId`. */
export function editorsOf(
  targetId: string,
  devices: Readonly<Record<string, DeviceHeartbeat>>,
  now: number,
  selfDeviceId: string,
): string[] {
  const editors: string[] = [];
  for (const [memberId, presence] of memberPresence(devices, now, selfDeviceId)) {
    if (presence.editing.includes(targetId)) editors.push(memberId);
  }
  return editors;
}
