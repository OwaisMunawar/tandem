import { type NoTablesSchema, type NoValuesSchema } from 'tinybase/with-schemas';

/**
 * The household document. Every cell is a CRDT register with its own
 * hybrid-logical-clock timestamp, so concurrent edits merge per field: one
 * phone renaming an item while another ticks it off keeps both changes.
 *
 * Shapes that must change together (a recurrence rule, a rotation) are
 * encoded into a single string cell for exactly that reason. Merging half of
 * someone's rotation with half of someone else's would be nonsense.
 */
export const tablesSchema = {
  members: {
    name: { type: 'string', default: '' },
    color: { type: 'string', default: '#1F7A63' },
    joinedAt: { type: 'number', default: 0 },
    /** Soft-leave: rows stay so history and rotations still resolve names. */
    leftAt: { type: 'number', default: 0 },
  },
  lists: {
    name: { type: 'string', default: '' },
    kind: { type: 'string', default: 'todo' },
    position: { type: 'number', default: 0 },
    createdAt: { type: 'number', default: 0 },
  },
  items: {
    listId: { type: 'string', default: '' },
    title: { type: 'string', default: '' },
    category: { type: 'string', default: 'other' },
    quantity: { type: 'string', default: '' },
    note: { type: 'string', default: '' },
    done: { type: 'boolean', default: false },
    assigneeId: { type: 'string', default: '' },
    /** Epoch ms, 0 when the item has no due date. */
    dueAt: { type: 'number', default: 0 },
    position: { type: 'number', default: 0 },
    createdAt: { type: 'number', default: 0 },
    createdBy: { type: 'string', default: '' },
    completedAt: { type: 'number', default: 0 },
  },
  chores: {
    title: { type: 'string', default: '' },
    assigneeId: { type: 'string', default: '' },
    /** JSON array of member ids; empty means no rotation. */
    rotation: { type: 'string', default: '[]' },
    /** JSON Recurrence, see features/chores/lib/recurrence.ts. */
    recurrence: { type: 'string', default: '{"kind":"daily","interval":1}' },
    /** Calendar date in the household time zone (YYYY-MM-DD). */
    dueDate: { type: 'string', default: '' },
    /** Wall-clock time in the household time zone (HH:mm). */
    dueTime: { type: 'string', default: '09:00' },
    createdAt: { type: 'number', default: 0 },
    lastDoneAt: { type: 'number', default: 0 },
    lastDoneBy: { type: 'string', default: '' },
  },
} as const;

export const valuesSchema = {
  householdName: { type: 'string', default: '' },
  /** IANA zone the household's chores are scheduled in. */
  timeZone: { type: 'string', default: 'UTC' },
  createdAt: { type: 'number', default: 0 },
} as const;

export type HouseholdSchemas = [typeof tablesSchema, typeof valuesSchema];

/**
 * Presence is a second, ephemeral document on its own sync channel. It is
 * never persisted on the device or the server, so heartbeats cannot bloat the
 * household's history.
 */
export const presenceTablesSchema = {
  devices: {
    memberId: { type: 'string', default: '' },
    lastSeen: { type: 'number', default: 0 },
    /** Item or chore id being edited, empty when idle. */
    editing: { type: 'string', default: '' },
  },
} as const;

export type PresenceSchemas = [typeof presenceTablesSchema, NoValuesSchema];

/** Per-device settings. A plain Store: these never sync. */
export const deviceValuesSchema = {
  roomId: { type: 'string', default: '' },
  memberId: { type: 'string', default: '' },
  serverUrl: { type: 'string', default: '' },
  deviceId: { type: 'string', default: '' },
  colorScheme: { type: 'string', default: 'system' },
  remindersEnabled: { type: 'boolean', default: false },
  syncPaused: { type: 'boolean', default: false },
  quickAddLlm: { type: 'boolean', default: true },
} as const;

export type DeviceSchemas = [NoTablesSchema, typeof deviceValuesSchema];
