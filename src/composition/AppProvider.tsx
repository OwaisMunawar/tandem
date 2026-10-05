import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { IS_DEMO, DEFAULT_SYNC_URL } from '@/core/config/env';
import { TandemError } from '@/core/errors/TandemError';
import { randomId } from '@/core/lib/ids';
import { createDeviceStore } from '@/core/store/createStores';
import { type DeviceStore } from '@/core/store/types';
import { type SchemePreference } from '@/core/theme';
import { seedDemoHousehold } from '@/demo/seed';
import { toZonedDate } from '@/features/chores/lib/zonedTime';
import { type Invite } from '@/features/households/lib/invite';
import { normaliseServerUrl } from '@/features/sync/lib/roomUrl';

import { openHouseholdRuntime, type HouseholdRuntime } from './householdRuntime';
import { type PersistedHandle, type Platform } from './ports';

export type AppStatus =
  { kind: 'booting' } | { kind: 'welcome' } | { kind: 'ready'; runtime: HouseholdRuntime };

export type AppActions = {
  createHousehold(input: {
    householdName: string;
    yourName: string;
    serverUrl: string;
  }): Promise<void>;
  joinHousehold(invite: Invite): Promise<void>;
  claimMember(memberId: string): void;
  joinAsNewMember(name: string): void;
  leaveHousehold(): Promise<void>;
  connectServer(serverUrl: string): Promise<void>;
  setSyncPaused(paused: boolean): Promise<void>;
  setColorScheme(preference: SchemePreference): void;
  setRemindersEnabled(enabled: boolean): void;
  setQuickAddLlm(enabled: boolean): void;
};

type AppContextValue = {
  status: AppStatus;
  device: DeviceStore;
  platform: Platform;
  actions: AppActions;
};

const AppContext = createContext<AppContextValue | null>(null);

/**
 * Owns the device settings and the open household. Every household
 * transition (create, join, leave, reconnect) goes through here so there is
 * exactly one runtime alive at a time and it is always closed before the
 * next one opens.
 */
export function AppProvider({ platform, children }: { platform: Platform; children: ReactNode }) {
  const [device] = useState(createDeviceStore);
  const [status, setStatus] = useState<AppStatus>({ kind: 'booting' });
  const runtimeRef = useRef<HouseholdRuntime | null>(null);
  const deviceHandle = useRef<PersistedHandle | null>(null);

  const open = useCallback(
    async (roomId: string, serverUrl: string) => {
      const runtime = await openHouseholdRuntime({
        roomId,
        serverUrl,
        deviceId: device.getValue('deviceId'),
        memberId: device.getValue('memberId'),
        paused: device.getValue('syncPaused'),
        platform,
      });
      runtimeRef.current = runtime;
      setStatus({ kind: 'ready', runtime });
      return runtime;
    },
    [device, platform],
  );

  const closeCurrent = useCallback(async (mode: 'close' | 'erase') => {
    const current = runtimeRef.current;
    runtimeRef.current = null;
    if (current) await (mode === 'erase' ? current.erase() : current.close());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      deviceHandle.current = await platform.persistDevice(device);
      if (!device.getValue('deviceId')) device.setValue('deviceId', randomId(16));
      if (cancelled) return;

      const roomId = device.getValue('roomId');
      if (roomId) {
        await open(roomId, device.getValue('serverUrl'));
      } else if (IS_DEMO) {
        const demoRoom = randomId();
        device.setValues({
          ...device.getValues(),
          roomId: demoRoom,
          serverUrl: DEFAULT_SYNC_URL,
          memberId: 'ngozi',
        });
        const runtime = await open(demoRoom, DEFAULT_SYNC_URL);
        const timeZone = platform.timeZone();
        seedDemoHousehold(runtime.store, {
          today: toZonedDate(platform.now(), timeZone),
          timeZone,
          now: platform.now(),
        });
      } else {
        setStatus({ kind: 'welcome' });
      }
    })();
    return () => {
      cancelled = true;
      void closeCurrent('close');
      void deviceHandle.current?.close();
    };
  }, [closeCurrent, device, open, platform]);

  const actions = useMemo<AppActions>(() => {
    const requireRuntime = () => {
      const runtime = runtimeRef.current;
      if (!runtime) throw new TandemError('HOUSEHOLD_NOT_FOUND', 'No household is open.');
      return runtime;
    };

    const setMember = (memberId: string) => {
      device.setValue('memberId', memberId);
      requireRuntime().beacon.setMember(memberId);
    };

    return {
      async createHousehold({ householdName, yourName, serverUrl }) {
        const server = serverUrl.trim() ? normaliseServerUrl(serverUrl) : '';
        if (server === null)
          throw new TandemError('INVALID_INPUT', 'That sync server address is not valid.');
        await closeCurrent('erase');
        const roomId = randomId();
        device.setValues({ ...device.getValues(), roomId, serverUrl: server, memberId: '' });
        const runtime = await open(roomId, server);
        const { founderId } = runtime.repos.household.initialise({
          name: householdName,
          timeZone: platform.timeZone(),
          founderName: yourName,
        });
        setMember(founderId);
      },

      async joinHousehold(invite) {
        await closeCurrent('erase');
        device.setValues({
          ...device.getValues(),
          roomId: invite.roomId,
          serverUrl: invite.serverUrl,
          memberId: '',
          syncPaused: false,
        });
        await open(invite.roomId, invite.serverUrl);
      },

      claimMember(memberId) {
        requireRuntime().repos.household.rejoin(memberId);
        setMember(memberId);
      },

      joinAsNewMember(name) {
        setMember(requireRuntime().repos.household.addMember(name));
      },

      async leaveHousehold() {
        const runtime = requireRuntime();
        const memberId = device.getValue('memberId');
        if (memberId) runtime.repos.household.leave(memberId);
        // Give the leave a moment to reach the server before the socket closes.
        if (runtime.session?.getState().phase === 'synced') {
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
        await closeCurrent('erase');
        device.setValues({
          ...device.getValues(),
          roomId: '',
          serverUrl: '',
          memberId: '',
          syncPaused: false,
        });
        setStatus({ kind: 'welcome' });
      },

      async connectServer(serverUrl) {
        const server = normaliseServerUrl(serverUrl);
        if (!server)
          throw new TandemError('INVALID_INPUT', 'That sync server address is not valid.');
        const roomId = requireRuntime().roomId;
        await closeCurrent('close');
        device.setValue('serverUrl', server);
        await open(roomId, server);
      },

      async setSyncPaused(paused) {
        device.setValue('syncPaused', paused);
        const session = requireRuntime().session;
        if (paused) await session?.pause();
        else session?.resume();
      },

      setColorScheme: (preference) => device.setValue('colorScheme', preference),
      setRemindersEnabled: (enabled) => device.setValue('remindersEnabled', enabled),
      setQuickAddLlm: (enabled) => device.setValue('quickAddLlm', enabled),
    };
  }, [closeCurrent, device, open, platform]);

  const value = useMemo(
    () => ({ status, device, platform, actions }),
    [status, device, platform, actions],
  );
  return <AppContext value={value}>{children}</AppContext>;
}

export function useApp(): AppContextValue {
  const value = use(AppContext);
  if (!value) throw new Error('useApp must be used inside <AppProvider>.');
  return value;
}

/** The open household. Only call from screens rendered once a household exists. */
export function useHousehold(): HouseholdRuntime {
  const { status } = useApp();
  if (status.kind !== 'ready') {
    throw new TandemError('HOUSEHOLD_NOT_FOUND', 'No household is open.');
  }
  return status.runtime;
}
