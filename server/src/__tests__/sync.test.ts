import { readdir } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';

import { startTandemServer, type TandemServer } from '../server';
import { createClient, tempDir, waitFor, type Client } from './helpers';

/*
 * End-to-end sync over a real WebSocket server: the app's own SyncSession on
 * both ends, TinyBase's WsServer in the middle, room files on disk.
 */

const ROOM = 'AbCdEfGhIjKlMnOpQrStUv';

describe('sync over a real server', () => {
  let server: TandemServer;
  let data: { path: string; cleanup: () => Promise<void> };
  const clients: Client[] = [];

  const client = (name: string, room = ROOM) => {
    const created = createClient(server.url, room, name);
    clients.push(created);
    created.session.start();
    return created;
  };

  beforeEach(async () => {
    data = await tempDir();
    server = await startTandemServer({ port: 0, dataDir: data.path, model: null });
  });

  afterEach(async () => {
    await Promise.all(clients.splice(0).map((c) => c.session.destroy()));
    await server.close();
    await data.cleanup();
  });

  it('syncs edits between two phones in real time', async () => {
    const a = client('a');
    const b = client('b');
    await waitFor(() => a.phase() === 'synced' && b.phase() === 'synced', 5_000, 'both synced');

    a.store.setRow('lists', 'groceries', { name: 'Groceries', kind: 'grocery' });
    const milk = a.lists.addItem('groceries', { title: 'Milk' });
    await waitFor(() => b.lists.item(milk)?.title === 'Milk', 5_000, 'milk on b');

    b.lists.setDone(milk, true);
    await waitFor(() => a.lists.item(milk)?.done === true, 5_000, 'done on a');
    expect(a.store.getContent()).toEqual(b.store.getContent());
  });

  it('shares presence on its own channel without persisting it', async () => {
    const a = client('a');
    const b = client('b');
    await waitFor(() => a.phase() === 'synced' && b.phase() === 'synced');
    a.presence.setRow('devices', 'phone-a', {
      memberId: 'ngozi',
      lastSeen: Date.now(),
      editing: 'milk',
    });
    await waitFor(
      () => b.presence.getCell('devices', 'phone-a', 'editing') === 'milk',
      5_000,
      'presence',
    );
    a.store.setValue('householdName', 'Flat');
    await waitFor(() => b.store.getValue('householdName') === 'Flat');
    expect((await readdir(data.path)).sort()).toEqual([`${ROOM}.json`]);
  });

  it('keeps rooms isolated', async () => {
    const a = client('a');
    const other = client('other', 'ZyXwVuTsRqPoNmLkJiHgFe');
    await waitFor(() => a.phase() === 'synced' && other.phase() === 'synced');
    a.store.setValue('householdName', 'Ours');
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(other.store.getValue('householdName')).toBe('');
  });

  it('counts pending changes while paused and merges them on resume', async () => {
    const a = client('a');
    const b = client('b');
    await waitFor(() => a.phase() === 'synced' && b.phase() === 'synced');
    a.store.setRow('lists', 'groceries', { name: 'Groceries', kind: 'grocery' });
    const milk = a.lists.addItem('groceries', { title: 'Milk' });
    await waitFor(() => b.lists.item(milk) !== null);

    await a.session.pause();
    await b.session.pause();
    expect(a.phase()).toBe('paused');

    // Both phones edit the same item offline: different fields, and one shared field.
    a.lists.updateItem(milk, { title: 'Oat milk', quantity: '2 L' });
    a.lists.addItem('groceries', { title: 'Eggs' });
    await new Promise((resolve) => setTimeout(resolve, 15));
    b.lists.updateItem(milk, { note: 'barista edition', quantity: '1 L' }); // later quantity
    b.lists.addItem('groceries', { title: 'Coffee' });
    expect(a.pending()).toBe(2);
    expect(b.pending()).toBe(2);

    a.session.resume();
    b.session.resume();
    await waitFor(() => a.phase() === 'synced' && b.phase() === 'synced', 5_000, 'resynced');
    await waitFor(
      () => isDeepStrictEqual(a.store.getContent(), b.store.getContent()),
      5_000,
      'convergence',
    );

    expect(a.pending()).toBe(0);
    expect(a.lists.item(milk)).toMatchObject({
      title: 'Oat milk',
      note: 'barista edition',
      quantity: '1 L',
    });
    expect(
      a.lists
        .itemsOf('groceries')
        .map((item) => item.title)
        .sort(),
    ).toEqual(['Coffee', 'Eggs', 'Oat milk']);
  });

  it('survives a server restart: phones reconnect on their own and data comes back from disk', async () => {
    const a = client('a');
    const b = client('b');
    await waitFor(() => a.phase() === 'synced' && b.phase() === 'synced');
    a.store.setValue('householdName', 'Before restart');
    await waitFor(() => b.store.getValue('householdName') === 'Before restart');
    await new Promise((resolve) => setTimeout(resolve, 200)); // let the room file save

    const port = Number(new URL(server.url).port);
    await server.close();
    await waitFor(() => a.phase() === 'offline' && b.phase() === 'offline', 5_000, 'offline');

    // Offline edits on both phones while the server is down.
    a.store.setValue('timeZone', 'Europe/Stockholm');
    b.store.setRow('members', 'sam', { name: 'Sam' });
    expect(a.pending()).toBe(1);

    server = await startTandemServer({ port, dataDir: data.path, model: null });
    await waitFor(() => a.phase() === 'synced' && b.phase() === 'synced', 8_000, 'reconnected');
    await waitFor(
      () => b.store.getValue('timeZone') === 'Europe/Stockholm' && a.store.hasRow('members', 'sam'),
      5_000,
      'merged',
    );

    // A brand new phone joining now gets everything, including what was on disk before the restart.
    const c = client('c');
    await waitFor(
      () =>
        c.store.getValue('householdName') === 'Before restart' && c.store.hasRow('members', 'sam'),
      5_000,
      'late joiner',
    );
  });

  it('stays offline and retries when the room path is refused', async () => {
    const bad = client('bad', 'short');
    await waitFor(() => bad.phase() === 'offline', 5_000, 'offline');
    await bad.session.destroy();
    expect(bad.phase()).toBe('offline');
  });

  it('ignores start after destroy and pause before connect', async () => {
    const a = createClient(server.url, ROOM, 'a');
    clients.push(a);
    await a.session.pause();
    a.session.start();
    expect(a.phase()).toBe('paused');
    a.session.resume();
    await waitFor(() => a.phase() === 'synced');
    const states: string[] = [];
    const unsubscribe = a.session.subscribe((state) => states.push(state.phase));
    await a.session.pause();
    unsubscribe();
    expect(states).toEqual(['paused']);
    await a.session.destroy();
    a.session.start();
    a.session.resume();
    await a.session.pause();
    expect(a.phase()).toBe('paused');
  });
});
