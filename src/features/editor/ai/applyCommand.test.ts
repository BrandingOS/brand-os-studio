// Unit tests for the browser-side applyCommand wrapper — Phase 3.5
// commit 4. Mocks fetch and exercises every failure mode of the
// network layer + verifies happy-path validation pass-through.

import { describe, expect, it, vi } from 'vitest';
import { createEdgeFunctionAgent } from './applyCommand';
import type { BrandKit } from '@/features/editor/brand/BrandKit';
import type { Brand } from '@/shared/types/brand';
import type { BrandOSDocument } from '@/features/editor/schema';

// Mock the supabase client — applyCommand calls it for auth + session
// id; the test fetcher receives the resulting bearer header but
// doesn't care about the value.
vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://mock.supabase.co',
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null } })),
      getUser: vi.fn(async () => ({ data: { user: null } })),
    },
  },
}));

const PAGE_ID = '00000000-0000-0000-0000-000000000aa1';
const LAYER_ID = '00000000-0000-0000-0000-000000000bb1';
const DOC_ID = '00000000-0000-0000-0000-000000000cc1';

function fixtureBrand(): Brand {
  return {
    id: 'brand-test',
    slug: 'test',
    name: 'Test Brand',
    primaryColor: '#1A1A2E',
    fonts: { primary: 'Inter' },
    tone: '',
    audience: '',
    assets: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function fixtureKit(): BrandKit {
  return {
    id: 'brand-test',
    name: 'Test Brand',
    colors: {
      primary: { hex: '#1A1A2E' },
      neutrals: ['#FAFAFA', '#E5E5E5', '#A3A3A3', '#737373', '#404040', '#1A1A1A'],
    },
    typography: { heading: { family: 'DM Sans' }, body: { family: 'Roboto' } },
    logos: { mono: {} },
    spacing: { unit: 8, cornerRadius: 8 },
    _diagnostics: { warnings: [] },
  };
}

function fixtureDoc(): BrandOSDocument {
  return {
    schemaVersion: 1,
    id: DOC_ID,
    contentType: 'social-post',
    brandId: 'brand-test',
    masterPages: [],
    pages: [
      {
        id: PAGE_ID,
        name: 'Page 1',
        width: 1080,
        height: 1080,
        background: '#ffffff',
        masterPageId: null,
        layers: [
          {
            id: LAYER_ID,
            kind: 'text',
            name: 'Headline',
            text: 'Hello',
            fontFamily: 'Inter',
            fontSize: 48,
            fontWeight: 600,
            lineHeight: 1.2,
            letterSpacing: 0,
            textAlign: 'left',
            direction: 'ltr',
            color: '#000000',
            transform: { x: 0, y: 0, width: 100, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
            opacity: 1,
            visible: true,
            locked: false,
            brandLocked: false,
          },
        ],
      },
    ],
    metadata: {},
  };
}

function makeAgent(fetcher: typeof fetch) {
  return createEdgeFunctionAgent({
    brandKit: fixtureKit(),
    endpoint: 'https://test.local/functions/v1/ai-apply-command',
    fetchImpl: fetcher,
  });
}

const ctx = {
  activePageId: PAGE_ID,
  selection: [],
  brand: fixtureBrand(),
};

// ─── Happy path ────────────────────────────────────────────────────────

describe('applyCommand — happy path', () => {
  it('returns a valid delta when the Edge Function returns one', async () => {
    const fetcher = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          result: {
            kind: 'delta',
            label: 'AI: change color',
            ops: [
              {
                op: 'update-layer',
                pageId: PAGE_ID,
                layerId: LAYER_ID,
                patch: { color: '#ff0000' },
              },
            ],
            message: 'Changed.',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    const agent = makeAgent(fetcher);
    const result = await agent.applyCommand(fixtureDoc(), 'change color', ctx);
    expect(result.kind).toBe('delta');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('passes through a Mode 5 rejection on schema-invalid AI output', async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ result: { kind: 'mutate', ops: [] } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const agent = makeAgent(fetcher);
    const result = await agent.applyCommand(fixtureDoc(), 'whatever', ctx);
    expect(result.kind).toBe('rejected');
    if (result.kind === 'rejected') {
      expect(result.reason).toBe('schema_invalid');
    }
  });
});

// ─── Network / transport failures ──────────────────────────────────────

describe('applyCommand — network failures', () => {
  it('returns rejected agent_error on fetch throw', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('connection refused');
    });
    const agent = makeAgent(fetcher);
    const result = await agent.applyCommand(fixtureDoc(), 'cmd', ctx);
    expect(result.kind).toBe('rejected');
    if (result.kind === 'rejected') {
      expect(result.reason).toBe('agent_error');
      expect(result.message).toMatch(/connection refused/);
    }
  });

  it('returns rejected agent_error on AbortError (timeout)', async () => {
    const fetcher = vi.fn(async () => {
      const e: Error & { name?: string } = new Error('aborted');
      e.name = 'AbortError';
      throw e;
    });
    const agent = makeAgent(fetcher);
    const result = await agent.applyCommand(fixtureDoc(), 'cmd', ctx);
    expect(result.kind).toBe('rejected');
    if (result.kind === 'rejected') {
      expect(result.reason).toBe('agent_error');
      expect(result.message).toMatch(/took too long/i);
    }
  });

  it('returns rejected agent_error on non-2xx status', async () => {
    const fetcher = vi.fn(async () =>
      new Response('rate limit hit', { status: 429 }),
    );
    const agent = makeAgent(fetcher);
    const result = await agent.applyCommand(fixtureDoc(), 'cmd', ctx);
    expect(result.kind).toBe('rejected');
    if (result.kind === 'rejected') {
      expect(result.reason).toBe('agent_error');
      expect(result.message).toMatch(/429/);
      expect(result.message).toMatch(/rate limit/);
    }
  });

  it('returns rejected agent_error when response body is not JSON', async () => {
    const fetcher = vi.fn(async () =>
      new Response('a string not json', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const agent = makeAgent(fetcher);
    const result = await agent.applyCommand(fixtureDoc(), 'cmd', ctx);
    expect(result.kind).toBe('rejected');
    if (result.kind === 'rejected') {
      expect(result.reason).toBe('agent_error');
      expect(result.message).toMatch(/non-JSON/);
    }
  });
});

// ─── Request shape ─────────────────────────────────────────────────────

describe('applyCommand — outgoing request shape', () => {
  it('posts the systemPrompt + command + brandId in the body', async () => {
    let captured: { body?: string } | undefined;
    const fetcher = vi.fn(async (_url: string, init: RequestInit) => {
      captured = { body: typeof init.body === 'string' ? init.body : '' };
      return new Response(
        JSON.stringify({
          result: {
            kind: 'rejected',
            reason: 'no_selection',
            message: 'OK',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    const agent = makeAgent(fetcher as unknown as typeof fetch);
    await agent.applyCommand(fixtureDoc(), 'add a button', ctx);
    expect(captured?.body).toBeTruthy();
    const parsed = JSON.parse(captured!.body!) as {
      command: string;
      systemPrompt: string;
      brandId: string;
    };
    expect(parsed.command).toBe('add a button');
    expect(parsed.brandId).toBe('brand-test');
    expect(parsed.systemPrompt.length).toBeGreaterThan(1000);
    // Sanity: spine markers appear in the systemPrompt.
    expect(parsed.systemPrompt).toMatch(/Return JSON and nothing else/);
    expect(parsed.systemPrompt).toMatch(/<brand_resolution>/);
  });

  it('forwards forceMock=true to the request body when set', async () => {
    let captured: { body?: string } | undefined;
    const fetcher = vi.fn(async (_url: string, init: RequestInit) => {
      captured = { body: typeof init.body === 'string' ? init.body : '' };
      return new Response(
        JSON.stringify({
          result: {
            kind: 'rejected',
            reason: 'unsupported',
            message: '(Mock mode)',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    const agent = createEdgeFunctionAgent({
      brandKit: fixtureKit(),
      endpoint: 'https://test.local/functions/v1/ai-apply-command',
      fetchImpl: fetcher as unknown as typeof fetch,
      forceMock: true,
    });
    await agent.applyCommand(fixtureDoc(), 'cmd', ctx);
    const parsed = JSON.parse(captured!.body!) as { mock?: boolean };
    expect(parsed.mock).toBe(true);
  });
});
