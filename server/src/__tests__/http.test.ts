import { MockLanguageModelV4 } from 'ai/test';
import { WebSocket } from 'ws';

import { type QuickAddDraft } from '../../../src/features/quick-add/lib/contract';
import { startTandemServer, type TandemServer } from '../server';
import { tempDir } from './helpers';

const draft: QuickAddDraft = {
  kind: 'chore',
  title: 'Dishes',
  category: 'general',
  quantity: '',
  assigneeId: 'sam',
  dueDate: '2026-10-05',
  dueTime: '20:00',
  recurrence: { kind: 'daily', interval: 1 },
  rotation: ['sam', 'ghost'],
  source: 'Sam does dishes daily',
};

const request = {
  text: 'Sam does dishes daily',
  today: '2026-10-05',
  now: '10:00',
  timeZone: 'Europe/London',
  members: [{ id: 'sam', name: 'Sam' }],
  selfId: null,
};

function mockModel(text: string) {
  return new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: 'text', text }],
      finishReason: { unified: 'stop', raw: undefined },
      usage: {
        inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: 20, text: 20, reasoning: undefined },
      },
      warnings: [],
    }),
  });
}

describe('http api', () => {
  let server: TandemServer;
  let data: { path: string; cleanup: () => Promise<void> };

  const start = async (model: MockLanguageModelV4 | null, limit = 20) => {
    data = await tempDir();
    server = await startTandemServer({
      port: 0,
      dataDir: data.path,
      model,
      quickAddRateLimit: limit,
    });
  };

  const post = (body: unknown) =>
    fetch(`${server.httpUrl}/v1/quick-add`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });

  afterEach(async () => {
    await server.close();
    await data.cleanup();
  });

  it('reports health and capabilities', async () => {
    await start(null);
    expect(await (await fetch(`${server.httpUrl}/health`)).json()).toEqual({
      ok: true,
      rooms: 0,
      clients: 0,
    });
    expect(await (await fetch(`${server.httpUrl}/v1/capabilities`)).json()).toEqual({
      quickAddLlm: false,
    });
    expect((await fetch(`${server.httpUrl}/nope`)).status).toBe(404);
  });

  it('refuses quick add when no model is configured', async () => {
    await start(null);
    expect((await post(request)).status).toBe(404);
    expect((await fetch(`${server.httpUrl}/v1/quick-add`)).status).toBe(405);
  });

  it('returns validated, sanitised drafts from the model', async () => {
    await start(mockModel(JSON.stringify({ drafts: [draft] })));
    expect(await (await fetch(`${server.httpUrl}/v1/capabilities`)).json()).toEqual({
      quickAddLlm: true,
    });
    const response = await post(request);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { parser: string; drafts: QuickAddDraft[] };
    expect(body.parser).toBe('llm');
    expect(body.drafts[0]).toMatchObject({ title: 'Dishes', assigneeId: 'sam', rotation: ['sam'] });
  });

  it('rejects bad requests and maps model failures to 502', async () => {
    await start(mockModel('not json at all'));
    expect((await post({ text: '' })).status).toBe(400);
    expect((await post('{oops')).status).toBe(400);
    expect((await post({ ...request, text: 'x'.repeat(9_000) })).status).toBe(413);
    expect((await post(request)).status).toBe(502);
  });

  it('rate limits the LLM endpoint per client', async () => {
    await start(mockModel(JSON.stringify({ drafts: [] })), 2);
    expect((await post(request)).status).toBe(200);
    expect((await post(request)).status).toBe(200);
    expect((await post(request)).status).toBe(429);
  });

  it('refuses socket upgrades for paths that are not rooms', async () => {
    await start(null);
    const outcome = await new Promise<string>((resolve) => {
      const socket = new WebSocket(`${server.url}/../etc`, 'tinybase');
      socket.on('open', () => resolve('open'));
      socket.on('error', () => resolve('refused'));
    });
    expect(outcome).toBe('refused');
  });
});
