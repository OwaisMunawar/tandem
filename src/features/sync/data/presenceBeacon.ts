import { type PresenceStore } from '../../../core/store/types';
import { HEARTBEAT_MS } from '../lib/presence';

export type PresenceBeacon = {
  setMember(memberId: string): void;
  setEditing(targetId: string): void;
  /** Stops heartbeats without leaving, e.g. while the app is in the background. */
  suspend(): void;
  resume(): void;
  stop(): void;
};

/**
 * Writes this device's heartbeat into the presence document. Other phones
 * derive "online" and "editing" from how fresh it is, so going quiet is
 * enough to appear offline; nothing has to be sent when a phone dies.
 */
export function startPresenceBeacon(
  presence: PresenceStore,
  deviceId: string,
  initialMemberId: string,
  now: () => number = Date.now,
): PresenceBeacon {
  let memberId = initialMemberId;
  let editing = '';
  let timer: ReturnType<typeof setInterval> | null = null;

  const beat = () => {
    if (!memberId) return;
    presence.setRow('devices', deviceId, { memberId, lastSeen: now(), editing });
  };

  const run = () => {
    if (timer) return;
    beat();
    timer = setInterval(beat, HEARTBEAT_MS);
  };

  const halt = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };

  run();

  return {
    setMember(next) {
      memberId = next;
      beat();
    },
    setEditing(targetId) {
      if (targetId === editing) return;
      editing = targetId;
      // Editing state is shown live on other phones, so it skips the timer.
      beat();
    },
    suspend: halt,
    resume: run,
    stop() {
      halt();
      presence.delRow('devices', deviceId);
    },
  };
}
