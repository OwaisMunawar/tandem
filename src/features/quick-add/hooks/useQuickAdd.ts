import { useEffect, useMemo, useState } from 'react';

import { useApp, useHousehold } from '@/composition/AppProvider';
import { useDeviceValue } from '@/core/store/hooks';
import { toZonedDate, toZonedTime } from '@/features/chores/lib/zonedTime';
import {
  useActiveMembers,
  useCurrentMemberId,
  useHouseholdTimeZone,
} from '@/features/households/hooks/useHouseholdData';
import { httpBaseUrl } from '@/features/sync/lib/roomUrl';

import { type QuickAddRequest } from '../lib/contract';
import { localQuickAddParser } from '../parsers/localQuickAddParser';
import { createQuickAddService } from '../parsers/quickAddService';
import {
  createRemoteQuickAddParser,
  fetchQuickAddCapability,
} from '../parsers/remoteQuickAddParser';

/** Whether the household's server offers LLM quick add, checked once per server. */
export function useLlmAvailable(): boolean {
  const { serverUrl } = useHousehold();
  const [probe, setProbe] = useState<{ serverUrl: string; available: boolean } | null>(null);
  useEffect(() => {
    if (!serverUrl) return undefined;
    let live = true;
    void fetchQuickAddCapability(httpBaseUrl(serverUrl)).then((available) => {
      if (live) setProbe({ serverUrl, available });
    });
    return () => {
      live = false;
    };
  }, [serverUrl]);
  // A probe for a previous server never counts for the current one.
  return Boolean(serverUrl) && probe?.serverUrl === serverUrl && probe.available;
}

export function useQuickAdd() {
  const { serverUrl } = useHousehold();
  const { device, platform } = useApp();
  const wantsLlm = useDeviceValue('quickAddLlm', device) ?? true;
  const available = useLlmAvailable();
  const members = useActiveMembers();
  const selfId = useCurrentMemberId();
  const timeZone = useHouseholdTimeZone();

  const service = useMemo(
    () =>
      createQuickAddService(
        localQuickAddParser,
        serverUrl && available && wantsLlm
          ? createRemoteQuickAddParser(httpBaseUrl(serverUrl))
          : null,
      ),
    [available, serverUrl, wantsLlm],
  );

  const buildRequest = (text: string): QuickAddRequest => {
    const now = platform.now();
    return {
      text,
      today: toZonedDate(now, timeZone),
      now: toZonedTime(now, timeZone),
      timeZone,
      members: members.map((member) => ({ id: member.id, name: member.name })),
      selfId: selfId || null,
    };
  };

  return { service, buildRequest, llmActive: Boolean(serverUrl && available && wantsLlm) };
}
