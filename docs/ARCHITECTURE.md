# Architecture

Tandem is a local-first app. Every phone holds the whole household in a CRDT
document on disk, reads and writes it with no network round trip, and syncs
with the other phones through a small relay server whenever one is reachable.
The server is a convenience, not the source of truth: if it disappears, every
phone still has everything, and a fresh server rebuilds itself from the first
phone that connects.

```
src/
  app/                  thin Expo Router routes, no logic
  composition/          AppProvider, household runtime, platform adapters
  core/
    store/              TinyBase schemas, store factories, typed hooks, SQLite persistence
    theme/  ui/         design tokens and the shared component library
    errors/             TandemError with codes
  features/
    households/         create, join (link + QR), members, leave
    lists/              groceries and to-dos: categories, grouping, ordering
    chores/             recurrence, rotation, time-zone-safe scheduling
    sync/               SyncSession, presence, sync pill
    quick-add/          contract, local parser, remote parser, preview
    reminders/          local notification planning
    widget/             iOS home-screen widget
  demo/                 the fictional household
server/                 Node sync server (TinyBase WsServer) + optional LLM endpoint
```

Each feature splits into `lib/` (pure TypeScript, relative imports only,
enforced by ESLint so the server can bundle it), `data/` (repositories and
adapters), `hooks/`, `components/` and `screens/`. Components never import
TinyBase; they go through feature hooks and repositories.

## Data model

One household is one TinyBase `MergeableStore`:

| Table / value | Cells                                                                                   |
| ------------- | --------------------------------------------------------------------------------------- |
| `members`     | name, color, joinedAt, leftAt (soft leave)                                              |
| `lists`       | name, kind (`grocery` / `todo`), position                                               |
| `items`       | listId, title, category, quantity, note, done, assigneeId, dueAt, position, completedAt |
| `chores`      | title, assigneeId, rotation (JSON), recurrence (JSON), dueDate, dueTime, lastDoneAt/By  |
| values        | householdName, timeZone, createdAt                                                      |

Presence is a second `MergeableStore` (`devices`: memberId, lastSeen, editing)
on its own sync channel. It is never persisted on the phone or the server.

Device settings (room id, member id, theme, reminders, "work offline") are a
plain `Store` persisted locally. They never sync.

## ADR-001: TinyBase MergeableStore as the sync engine

**Decision.** Use TinyBase 10's `MergeableStore` with the expo-sqlite persister
on device and the WebSocket synchronizer to a TinyBase `WsServer`.

**Why.** A household is a few hundred rows edited by a handful of people,
often offline (supermarket basements, trains). That needs a CRDT that runs
entirely on the device, persists to SQLite, has typed schemas, works with
React via hooks and ships a self-hostable server in a few lines. TinyBase does
all of that in one dependency with no native code of its own.

**Rejected alternatives.**

- **Zero (Rocicorp).** Excellent for server-authoritative apps with large
  Postgres datasets, but the server is the source of truth and queries need a
  running zero-cache plus Postgres. Tandem has to work with no server at all.
- **InstantDB.** Great developer experience and offline caching, but it is a
  hosted backend first; self-hosting is heavier than one Node process, and the
  local copy is a cache rather than the authoritative document.
- **PowerSync.** Solid SQLite-on-device sync, but it syncs to a Postgres (or
  MongoDB/MySQL) backend through a sync service with write-back handled by
  your API. That is two services and a database for a shopping list.
- **Automerge.** A more general CRDT (text, lists, history). Its document
  model and repo layer are more than this data needs, the RN integration means
  a WASM or native build, and row-and-cell data with last-writer-wins per field
  is exactly TinyBase's shape.

## ADR-002: Merge semantics

Every cell is a last-writer-wins register stamped with a hybrid logical clock
(wall clock plus counter plus a per-store id for tie-breaks). Merging two
copies takes, per cell, the value with the higher stamp. Consequences:

- **Different fields of one item merge.** Renaming "Milk" on one phone while
  ticking it on another keeps both. Repositories write with `setPartialRow`
  and skip unchanged cells so untouched fields keep their old stamps.
- **Same field: the later edit wins**, regardless of which phone syncs first.
- **Concurrent additions are all kept**: new rows have random ids.
- **Deletes are tombstones**, so a delete reaches phones that were offline.
  Undo re-writes the row, which is simply a later write and wins.
- **Things that must change together are one cell.** A chore's recurrence and
  rotation are JSON strings, so a concurrent edit replaces the rule whole
  instead of merging half of each.
- **Two people completing the same chore offline converge**: both phones
  compute the next occurrence from the same due date and rotation, so they
  write the same values; the later completer is recorded.
- **Reordering** uses fractional positions: a move writes one cell on one row,
  so concurrent reorders of different items never collide.

These rules are tested directly in
[`mergeConvergence.test.ts`](../src/features/sync/__tests__/mergeConvergence.test.ts)
(two and three simulated phones with controlled clocks) and end to end over a
real socket in [`server/src/__tests__/sync.test.ts`](../server/src/__tests__/sync.test.ts).

Text fields commit on blur rather than per keystroke. Field-level LWW on whole
values never produces a title neither person typed.

## ADR-003: One socket, two channels

The household and presence documents share one WebSocket using TinyBase's
channel multiplexing (`createWsSynchronizer(store, socket, 'data')` and
`'presence'`). The server persists `<room>/data` to a JSON file and keeps
`<room>/presence` in a memory-only store, so heartbeats never touch disk or
the household's history.

TinyBase synchronizers do not survive a dropped socket. `SyncSession` owns the
connection lifecycle: it builds a fresh synchronizer pair per attempt, tears
both down on close, and retries with exponential backoff and full jitter. It
queues nothing itself; the CRDT is the outbox, and the first exchange after
reconnecting sends whatever the other side lacks. The "N pending changes"
count is a display hint (rows edited while disconnected), not a queue.

## ADR-004: Server trust model (v0.1)

**There is no authentication in v0.1.** A household is a room on the server,
addressed by a 22-character random id (132 bits from `expo-crypto`). Anyone
who has the id can read and write that household. The id travels only in the
invite QR code or a link the user chooses to share.

What the server does enforce:

- Socket upgrades are refused unless the path is a well-formed room id, so
  room ids can safely become file names.
- Room data is stored as one JSON file per room in `DATA_DIR`.
- The HTTP API never exposes household data; it serves `/health`,
  `/v1/capabilities` and the optional quick-add endpoint, with an 8 KB body
  limit and a per-address rate limit.

What it does not do, honestly: no accounts, no per-member permissions, no way
to revoke a leaked invite except starting a new household, no encryption at
rest, and TLS is your reverse proxy's job (run it behind Caddy or similar and
use `wss://`). The roadmap has signed invites and per-room keys. Until then,
self-host it for people you would give a house key to.

## ADR-005: Quick add, local first

`QuickAddParser` has two implementations returning the same zod-validated
`QuickAddDraft[]`:

- **Local (default).** Deterministic rules: clause splitting that knows
  "salt and pepper" is one thing and "Mondays and Thursdays" is one schedule,
  chrono-node for dates (resolved in the household zone, not the device's),
  recurrence patterns, quantities and units, longest-keyword categorisation,
  and assignee matching against household names (first names only when
  unambiguous). Works offline, same answer every time.
- **LLM (optional).** `POST /v1/quick-add` on the sync server calls
  `generateText` with `Output.object` (AI SDK v7's structured output) against
  the same zod schema. The model is a plain AI Gateway id from
  `QUICK_ADD_MODEL`, so any provider works. Used only when the server reports
  it is configured and the user has not turned it off.

Both outputs go through `sanitizeDrafts` (unknown member ids cleared, wrong
categories repaired, chores without a rule demoted to to-dos), on the server
and again on the phone. Any LLM failure falls back to the local parser.
Nothing is written until the user confirms the preview.

The contract lives in `src/features/quick-add/lib/contract.ts` and is bundled
into the server by esbuild, so the app and server cannot drift apart.

## ADR-006: Time zones and DST

Chores are stored as a calendar date plus a wall-clock time in the
household's IANA zone (`2026-10-05` + `20:00`), never as instants. Recurrence
is calendar arithmetic, so "daily at 07:00" stays at 07:00 across a DST change
and a 23-hour day. Instants are computed only at the edge (reminders,
"overdue"), with an Intl-based converter that handles the spring-forward gap
(02:30 becomes 03:30) and the fall-back overlap (the earlier 01:30 wins, so a
reminder is never an hour late). Which day a chore was done on is decided in
the household zone, so a phone travelling abroad does not shift everyone's
schedule.

## ADR-007: Widget data sharing

The iOS widget is built with `expo-widgets` (SDK 57). Widget components run in
the widget extension's own JS runtime and can only receive props, so the app
computes a small JSON snapshot (`buildTodaySnapshot`: today's and overdue
chores, then what was done today) and calls `updateSnapshot` whenever chores
change, from any phone. `expo-widgets` writes it into the app group container
(`group.com.owaismunawar.tandem`) shared with the extension. The widget never
opens the database or the socket.

Android: `expo-widgets` is iOS-only in SDK 57, and the module resolves to a
no-op stub on Android, so the same code path is safe there. An Android widget
(Glance) is on the roadmap.

## ADR-008: Reminders are per device

Each phone schedules local notifications only for chores and to-dos assigned
to its member or to anyone, within 14 days, capped below iOS's 64 pending
limit. Notification ids encode the occurrence (`chore:<id>:<date>:<time>`), so
syncing a change from another phone cancels and reschedules exactly what
changed. There is no push server.
