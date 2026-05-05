// Regression guards for the AI system prompt — Phase 3.5 commit 1.
//
// These tests assert that load-bearing rules + structural elements
// remain present in SYSTEM_PROMPT_SPINE. The spine is the highest-stakes
// content in Phase 3.5 — a silent regression ("oh, I removed the SlotRef
// rule") would degrade every AI call. These tests fail loudly on any
// such regression. Pair every spine edit with a corresponding test.

import { describe, expect, it } from 'vitest';
import { SYSTEM_PROMPT_SPINE, buildSystemPrompt } from './systemPrompt';
import type { BrandKit } from '@/features/editor/brand/BrandKit';
import type { Brand } from '@/shared/types/brand';
import type { BrandOSDocument } from '@/features/editor/schema';

function fixtureKit(): BrandKit {
  return {
    id: 'brand-test',
    name: 'Test Brand',
    colors: {
      primary: { hex: '#1A1A2E', name: 'Brand Navy' },
      neutrals: ['#FAFAFA', '#E5E5E5', '#A3A3A3', '#737373', '#404040', '#1A1A1A'],
    },
    typography: {
      heading: { family: 'DM Sans' },
      body: { family: 'Roboto' },
    },
    logos: { mono: {} },
    spacing: { unit: 8, cornerRadius: 8 },
    _diagnostics: { warnings: [] },
  };
}

function fixtureBrand(): Brand {
  return {
    id: 'brand-test',
    slug: 'test',
    name: 'Test Brand',
    primaryColor: '#1A1A2E',
    fonts: { primary: 'DM Sans' },
    tone: '',
    audience: '',
    assets: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function fixtureDoc(): BrandOSDocument {
  return {
    schemaVersion: 1,
    id: '00000000-0000-0000-0000-0000000000aa',
    contentType: 'social-post',
    brandId: 'brand-test',
    masterPages: [],
    pages: [
      {
        id: '00000000-0000-0000-0000-0000000000bb',
        name: 'Page 1',
        width: 1080,
        height: 1080,
        background: '#ffffff',
        masterPageId: null,
        layers: [],
      },
    ],
    metadata: {},
  };
}

describe('SYSTEM_PROMPT_SPINE — load-bearing rules', () => {
  it('declares the JSON-only output rule', () => {
    expect(SYSTEM_PROMPT_SPINE).toMatch(/Return JSON and nothing else\./);
  });

  it('declares the three discriminated variants (delta, replace, rejected)', () => {
    expect(SYSTEM_PROMPT_SPINE).toMatch(/"kind": "delta"/);
    expect(SYSTEM_PROMPT_SPINE).toMatch(/"kind": "replace"/);
    expect(SYSTEM_PROMPT_SPINE).toMatch(/"kind": "rejected"/);
  });

  it('marks delta as PREFERRED and replace as REQUIRES JUSTIFICATION (Q2 enforcement)', () => {
    expect(SYSTEM_PROMPT_SPINE).toMatch(/PREFERRED/);
    expect(SYSTEM_PROMPT_SPINE).toMatch(/REQUIRES JUSTIFICATION/);
    expect(SYSTEM_PROMPT_SPINE).toMatch(/justification/);
  });

  it('lists every rejection reason code', () => {
    const codes = [
      '"no_selection"',
      '"out_of_selection_scope"',
      '"replace_unjustified"',
      '"schema_invalid"',
      '"empty_prompt"',
      '"unsupported"',
      '"agent_error"',
    ];
    for (const code of codes) {
      expect(SYSTEM_PROMPT_SPINE, `missing rejection code ${code}`).toContain(code);
    }
  });

  it('declares the SlotRef rule (Q6 — non-negotiable, with WRONG/RIGHT examples)', () => {
    // Rule 3 — title.
    expect(SYSTEM_PROMPT_SPINE).toMatch(/SlotRefs for brand-bound properties/);
    // WRONG / RIGHT contrast.
    expect(SYSTEM_PROMPT_SPINE).toMatch(/WRONG \(loses brand binding\)/);
    expect(SYSTEM_PROMPT_SPINE).toMatch(/RIGHT \(preserves brand binding\)/);
  });

  it('lists every SlotRef type the schema permits', () => {
    const types = [
      'brand.color.primary',
      'brand.color.secondary',
      'brand.color.accent',
      'brand.color.neutral',
      'brand.font.heading',
      'brand.font.body',
      'brand.logo.primary',
      'brand.logo.secondary',
      'brand.logo.wordmark',
      'brand.logo.iconmark',
      'brand.logo.mono.black',
      'brand.logo.mono.white',
      'brand.spacing.unit',
    ];
    for (const t of types) {
      expect(SYSTEM_PROMPT_SPINE, `missing SlotRef type ${t}`).toContain(t);
    }
  });

  it('lists every Layer kind (text, shape, image, svg, logo, group)', () => {
    for (const kind of ['text', 'shape', 'image', 'svg', 'logo', 'group']) {
      expect(SYSTEM_PROMPT_SPINE, `missing layer kind ${kind}`).toMatch(
        new RegExp(`kind: '${kind}'`),
      );
    }
  });

  it('declares the Mode 4 selection-scope rule (Q5 safety)', () => {
    expect(SYSTEM_PROMPT_SPINE).toMatch(/Mode 4 stays in scope/);
    expect(SYSTEM_PROMPT_SPINE).toMatch(/out_of_selection_scope/);
  });

  it('declares the disambiguation field shape (Q5)', () => {
    expect(SYSTEM_PROMPT_SPINE).toMatch(/disambiguation/);
    expect(SYSTEM_PROMPT_SPINE).toMatch(/mode4_alternative/);
    expect(SYSTEM_PROMPT_SPINE).toMatch(/mode3_alternative/);
  });

  it('includes RTL guidance on the direction field (Adjustment 4)', () => {
    expect(SYSTEM_PROMPT_SPINE).toMatch(/direction.*'rtl'/);
    expect(SYSTEM_PROMPT_SPINE).toMatch(/Arabic/);
    // The text "auto.*unreliable" appears in an explanatory sentence.
    expect(SYSTEM_PROMPT_SPINE).toMatch(/'auto'.*unreliable/i);
  });

  it('contains all six worked examples (A through F, with F covering RTL)', () => {
    expect(SYSTEM_PROMPT_SPINE).toMatch(/## Example A — Mode 2 additive/);
    expect(SYSTEM_PROMPT_SPINE).toMatch(/## Example B — Mode 4 refine/);
    expect(SYSTEM_PROMPT_SPINE).toMatch(/## Example C — Mode 3 with disambiguation/);
    expect(SYSTEM_PROMPT_SPINE).toMatch(/## Example D — Rejection/);
    expect(SYSTEM_PROMPT_SPINE).toMatch(/## Example E — Justified replace/);
    expect(SYSTEM_PROMPT_SPINE).toMatch(/## Example F — Mode 3 translation \(RTL\)/);
  });

  it('Example E is a fully realized doc (not abbreviated) — has 5 pages and recognizable layer kinds', () => {
    // Crude but effective: the expanded Example E has 5 page entries,
    // multiple "kind": "text" layers, and contentType social-post.
    const exampleEStart = SYSTEM_PROMPT_SPINE.indexOf('## Example E');
    const exampleFStart = SYSTEM_PROMPT_SPINE.indexOf('## Example F');
    const slice = SYSTEM_PROMPT_SPINE.slice(exampleEStart, exampleFStart);
    expect(slice).toMatch(/"contentType": "social-post"/);
    // Each "Post N" page has a name field — count them.
    const postNameMatches = slice.match(/"name": "Post \d+/g) ?? [];
    expect(postNameMatches.length).toBe(5);
    // Multiple text layers.
    const textKindMatches = slice.match(/"kind": "text"/g) ?? [];
    expect(textKindMatches.length).toBeGreaterThanOrEqual(8);
  });
});

describe('buildSystemPrompt — assembly', () => {
  it('assembles the spine + all dynamic blocks in the right order', () => {
    // Use a unique-string brand card body so the matcher doesn't collide
    // with prose mentions of `<brand handle="@slug">` inside the spine.
    const cardMarker = '__TEST_CARD_MARKER_42__';
    const prompt = buildSystemPrompt({
      brand: fixtureBrand(),
      brandKit: fixtureKit(),
      brandCardBlock: `<brand handle="@test">${cardMarker}</brand>`,
      doc: fixtureDoc(),
      context: { activePageId: '00000000-0000-0000-0000-0000000000bb', selection: [] },
    });

    // Spine first.
    expect(prompt.indexOf(SYSTEM_PROMPT_SPINE)).toBe(0);
    // Then document, brand card (located by the unique marker), brand
    // resolution, selection.
    const docIdx = prompt.indexOf('<document>\n{');
    const brandIdx = prompt.indexOf(cardMarker);
    const resIdx = prompt.indexOf('<brand_resolution>\n');
    const selIdx = prompt.indexOf('<selection>\n');
    expect(docIdx).toBeGreaterThan(0);
    expect(brandIdx).toBeGreaterThan(docIdx);
    expect(resIdx).toBeGreaterThan(brandIdx);
    expect(selIdx).toBeGreaterThan(resIdx);
  });

  it('renders the no-selection state cleanly', () => {
    const prompt = buildSystemPrompt({
      brand: fixtureBrand(),
      brandKit: fixtureKit(),
      brandCardBlock: '<brand handle="@test"></brand>',
      doc: fixtureDoc(),
      context: { activePageId: '00000000-0000-0000-0000-0000000000bb', selection: [] },
    });
    expect(prompt).toMatch(/state: no_selection/);
  });

  it('renders selected layers as (kind, name) tuples', () => {
    const doc = fixtureDoc();
    const layerId = '00000000-0000-0000-0000-0000000000cc';
    doc.pages[0].layers = [
      {
        id: layerId,
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
    ];
    const prompt = buildSystemPrompt({
      brand: fixtureBrand(),
      brandKit: fixtureKit(),
      brandCardBlock: '<brand handle="@test"></brand>',
      doc,
      context: { activePageId: doc.pages[0].id, selection: [layerId] },
    });
    expect(prompt).toMatch(/state: has_selection/);
    expect(prompt).toMatch(/kind=text, name="Headline"/);
  });

  it('appends a closed <mode_hint> block with content when set', () => {
    const prompt = buildSystemPrompt({
      brand: fixtureBrand(),
      brandKit: fixtureKit(),
      brandCardBlock: '<brand handle="@test"></brand>',
      doc: fixtureDoc(),
      context: {
        activePageId: '00000000-0000-0000-0000-0000000000bb',
        selection: [],
        modeHint: 'mode-4-refine',
      },
    });
    // Closed-tag form with the literal mode value distinguishes the
    // appended dynamic block from the spine's prose mention of
    // `<mode_hint>` in §2.
    expect(prompt).toMatch(/<mode_hint>mode-4-refine<\/mode_hint>/);
  });

  it('does NOT append a closed <mode_hint>...mode-...</mode_hint> block when modeHint unset', () => {
    const prompt = buildSystemPrompt({
      brand: fixtureBrand(),
      brandKit: fixtureKit(),
      brandCardBlock: '<brand handle="@test"></brand>',
      doc: fixtureDoc(),
      context: { activePageId: '00000000-0000-0000-0000-0000000000bb', selection: [] },
    });
    // The spine itself mentions `<mode_hint>` in prose — that's fine.
    // The dynamic block is the closed-tag form with a `mode-` value.
    expect(prompt).not.toMatch(/<mode_hint>mode-[a-z0-9-]+<\/mode_hint>/);
  });

  it('omits <brand_memory> when no snapshot is provided (Phase 6.6)', () => {
    const prompt = buildSystemPrompt({
      brand: fixtureBrand(),
      brandKit: fixtureKit(),
      brandCardBlock: '<brand handle="@test"></brand>',
      doc: fixtureDoc(),
      context: { activePageId: '00000000-0000-0000-0000-0000000000bb', selection: [] },
    });
    expect(prompt).not.toContain('<brand_memory>');
  });

  it('renders <brand_memory> after <brand_resolution> when snapshot present (Phase 6.6)', () => {
    const prompt = buildSystemPrompt({
      brand: fixtureBrand(),
      brandKit: fixtureKit(),
      brandCardBlock: '<brand handle="@test"></brand>',
      doc: fixtureDoc(),
      context: { activePageId: '00000000-0000-0000-0000-0000000000bb', selection: [] },
      brandMemory: {
        computedAt: '2026-05-04T00:00:00Z',
        colors: [{ hex: '#ff0000', count: 5 }],
        fonts: [{ family: 'Inter', count: 3 }],
      },
    });
    const resIdx = prompt.indexOf('<brand_resolution>\n');
    const memIdx = prompt.indexOf('<brand_memory>\n');
    const selIdx = prompt.indexOf('<selection>\n');
    expect(memIdx).toBeGreaterThan(resIdx);
    expect(selIdx).toBeGreaterThan(memIdx);
    expect(prompt).toContain('- #ff0000 (×5)');
    expect(prompt).toContain('- Inter (×3)');
  });
});
