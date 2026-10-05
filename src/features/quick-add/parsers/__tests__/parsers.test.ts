import { type QuickAddDraft, type QuickAddRequest } from '../../lib/contract';
import { localQuickAddParser } from '../localQuickAddParser';
import { createQuickAddService } from '../quickAddService';
import { createRemoteQuickAddParser, fetchQuickAddCapability } from '../remoteQuickAddParser';

const request: QuickAddRequest = {
  text: 'milk, Sam does dishes daily',
  today: '2026-10-05',
  now: '10:00',
  timeZone: 'Europe/London',
  members: [{ id: 'sam', name: 'Sam' }],
  selfId: null,
};

const llmDraft: QuickAddDraft = {
  kind: 'chore',
  title: 'Dishes',
  category: 'general',
  quantity: '',
  assigneeId: 'not-a-member',
  dueDate: '2026-10-05',
  dueTime: '20:00',
  recurrence: { kind: 'daily', interval: 1 },
  rotation: [],
  source: 'Sam does dishes daily',
};

const respond = (status: number, body: unknown) =>
  jest.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
  );

describe('quick-add parsers', () => {
  it('parses locally', async () => {
    const drafts = await localQuickAddParser.parse(request);
    expect(drafts.map((d) => d.kind)).toEqual(['grocery', 'chore']);
  });

  it('calls the server, validates and sanitises its answer', async () => {
    const fetch = respond(200, { parser: 'llm', drafts: [llmDraft] });
    const parser = createRemoteQuickAddParser('http://sync.test', { fetch });
    const drafts = await parser.parse(request);
    expect(fetch).toHaveBeenCalledWith(
      'http://sync.test/v1/quick-add',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(drafts[0]).toMatchObject({ title: 'Dishes', assigneeId: null });
  });

  it.each([
    ['an error status', respond(502, { error: 'down' }), 'QUICK_ADD_UNAVAILABLE'],
    [
      'a malformed body',
      respond(200, { drafts: [{ kind: 'pizza' }] }),
      'QUICK_ADD_INVALID_RESPONSE',
    ],
    [
      'a network failure',
      jest.fn(async () => Promise.reject(new TypeError('Network request failed'))),
      'QUICK_ADD_UNAVAILABLE',
    ],
  ])('maps %s to a typed error', async (_label, fetch, code) => {
    const parser = createRemoteQuickAddParser('http://sync.test', {
      fetch: fetch as unknown as typeof globalThis.fetch,
    });
    await expect(parser.parse(request)).rejects.toMatchObject({ name: 'TandemError', code });
  });

  it('aborts slow servers', async () => {
    const fetch = jest.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_, reject) =>
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))),
        ),
    );
    const parser = createRemoteQuickAddParser('http://sync.test', {
      fetch: fetch as unknown as typeof globalThis.fetch,
      timeoutMs: 10,
    });
    await expect(parser.parse(request)).rejects.toMatchObject({ code: 'QUICK_ADD_UNAVAILABLE' });
    const controller = new AbortController();
    const pending = createRemoteQuickAddParser('http://sync.test', {
      fetch: fetch as unknown as typeof globalThis.fetch,
    }).parse(request, controller.signal);
    controller.abort();
    await expect(pending).rejects.toBeDefined();
  });

  it('falls back to the local parser when the LLM fails', async () => {
    const failing = {
      kind: 'llm' as const,
      parse: jest.fn(async () => Promise.reject(new Error('nope'))),
    };
    const service = createQuickAddService(localQuickAddParser, failing);
    expect(await service.parse(request)).toMatchObject({ parser: 'local', fellBack: true });

    const working = { kind: 'llm' as const, parse: jest.fn(async () => [llmDraft]) };
    expect(await createQuickAddService(localQuickAddParser, working).parse(request)).toMatchObject({
      parser: 'llm',
      fellBack: false,
    });
    expect(await createQuickAddService(localQuickAddParser, null).parse(request)).toMatchObject({
      parser: 'local',
      fellBack: false,
    });
  });

  it('probes the capability endpoint and treats any failure as "no"', async () => {
    expect(
      await fetchQuickAddCapability(
        'http://s',
        respond(200, { quickAddLlm: true }) as unknown as typeof fetch,
      ),
    ).toBe(true);
    expect(
      await fetchQuickAddCapability(
        'http://s',
        respond(200, { quickAddLlm: 'yes' }) as unknown as typeof fetch,
      ),
    ).toBe(false);
    expect(
      await fetchQuickAddCapability('http://s', respond(404, {}) as unknown as typeof fetch),
    ).toBe(false);
    expect(
      await fetchQuickAddCapability(
        'http://s',
        jest.fn(async () => Promise.reject(new Error('x'))) as unknown as typeof fetch,
      ),
    ).toBe(false);
  });
});
