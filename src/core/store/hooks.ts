import * as UiReact from 'tinybase/ui-react/with-schemas';

import { type DeviceSchemas, type HouseholdSchemas, type PresenceSchemas } from './schema';

/**
 * Schema-typed TinyBase hooks. Components never import tinybase/ui-react
 * directly; feature hooks build on these, so a misspelt cell is a compile
 * error rather than a silently empty list. Stores are always passed
 * explicitly, which keeps several stores in one tree unambiguous.
 */
const Household = UiReact as UiReact.WithSchemas<HouseholdSchemas>;
const Presence = UiReact as UiReact.WithSchemas<PresenceSchemas>;
const Device = UiReact as UiReact.WithSchemas<DeviceSchemas>;

export const { useTable, useRow, useValue, useValues } = Household;
export const { useTable: usePresenceTable } = Presence;
export const { useValue: useDeviceValue } = Device;
