/**
 * Layout catalog — names, one-line descriptions, and default-block
 * blueprints for every layout in the v2 library. Used by the
 * AddSlidePopover and `buildEmptySlide()` to insert a fresh slide
 * pre-wired with the slot ids each layout expects.
 *
 * The catalog is intentionally hand-curated (rather than reflected from
 * each layout) so:
 *   - We can author user-facing names + descriptions independently of
 *     the implementation file's internal `LayoutId`.
 *   - Default blocks can ship with placeholder copy / role hints that
 *     match the layout's empty-slate UX.
 *
 * Adding a layout? Add a `LayoutMeta` entry here AND register the
 * layout component in `./registry` via `./index.ts`. Both are needed —
 * one populates the picker, the other makes the layout actually render.
 */

import type { DeckTypeRole } from '@/shared/presentation/theme/types';
import type { Block, LayoutId, Slide } from '../types';

export interface LayoutMeta {
  id: LayoutId;
  name: string;
  description: string;
  /**
   * Every slot the layout expects, with the kind of Block to seed it
   * with. `placeholder` (when present) becomes the initial `text` for
   * text/list/quote/stat blocks. `role` is forwarded to TextBlock.role.
   */
  defaultBlocks: Record<string, SlotDef>;
}

export interface SlotDef {
  kind: Block['kind'];
  placeholder?: string;
  role?: DeckTypeRole;
  marker?: 'dot' | 'check' | 'arrow' | 'number' | 'none';
  items?: string[];
}

export const LAYOUT_CATALOG: LayoutMeta[] = [
  {
    id: 'cover',
    name: 'Cover',
    description: 'Title slide — big headline + subtitle + optional hero image.',
    defaultBlocks: {
      tag: { kind: 'text', role: 'label', placeholder: '#TAG' },
      title: { kind: 'text', role: 'display', placeholder: 'Your headline' },
      subtitle: { kind: 'text', role: 'h3', placeholder: 'One-line elevator pitch' },
      image: { kind: 'image' },
      logo: { kind: 'logo' },
    },
  },
  {
    id: 'section-divider',
    name: 'Section Divider',
    description: 'Big section name on a brand-color band — used between chapters.',
    defaultBlocks: {
      label: { kind: 'text', role: 'label', placeholder: 'Chapter 02' },
      title: { kind: 'text', role: 'display', placeholder: 'Section title' },
    },
  },
  {
    id: 'title-body',
    name: 'Title + Body',
    description: 'Centered title with a longer body paragraph beneath it.',
    defaultBlocks: {
      label: { kind: 'text', role: 'label', placeholder: 'Eyebrow' },
      title: { kind: 'text', role: 'h1', placeholder: 'Slide title' },
      body: { kind: 'text', role: 'body', placeholder: 'Body copy goes here…' },
    },
  },
  {
    id: 'bullets',
    name: 'Bulleted List',
    description: 'Title + intro line + a list of points (dot, check, arrow, or numbered).',
    defaultBlocks: {
      label: { kind: 'text', role: 'label', placeholder: 'Eyebrow' },
      title: { kind: 'text', role: 'h1', placeholder: 'Slide title' },
      intro: { kind: 'text', role: 'body', placeholder: 'One-line intro (optional)' },
      bullets: {
        kind: 'list',
        role: 'body',
        marker: 'dot',
        items: ['First point', 'Second point', 'Third point'],
      },
      image: { kind: 'image' },
    },
  },
  {
    id: 'two-column',
    name: 'Two Column',
    description: 'Two side-by-side blocks — each with a heading and body.',
    defaultBlocks: {
      label: { kind: 'text', role: 'label', placeholder: 'Eyebrow' },
      title: { kind: 'text', role: 'h1', placeholder: 'Slide title' },
      leftTitle: { kind: 'text', role: 'h3', placeholder: 'Left heading' },
      leftBody: { kind: 'text', role: 'body', placeholder: 'Left column copy' },
      rightTitle: { kind: 'text', role: 'h3', placeholder: 'Right heading' },
      rightBody: { kind: 'text', role: 'body', placeholder: 'Right column copy' },
    },
  },
  {
    id: 'image-text',
    name: 'Image + Text',
    description: 'A hero image alongside a title, body, and optional CTA.',
    defaultBlocks: {
      label: { kind: 'text', role: 'label', placeholder: 'Eyebrow' },
      title: { kind: 'text', role: 'h1', placeholder: 'Slide title' },
      body: { kind: 'text', role: 'body', placeholder: 'Body copy goes here…' },
      cta: { kind: 'text', role: 'label', placeholder: 'Call to action' },
      image: { kind: 'image' },
    },
  },
  {
    id: 'quote',
    name: 'Quote',
    description: 'A pull-quote with attribution and an optional avatar image.',
    defaultBlocks: {
      quote: { kind: 'quote', placeholder: 'A memorable line from a customer or stakeholder.' },
      attribution: { kind: 'text', role: 'caption', placeholder: 'Name · Role' },
      image: { kind: 'image' },
    },
  },
  {
    id: 'stats-3',
    name: 'Three Stats',
    description: 'Three big KPI numbers shown side-by-side, with an optional footnote.',
    defaultBlocks: {
      label: { kind: 'text', role: 'label', placeholder: 'KEY METRICS' },
      title: { kind: 'text', role: 'h1', placeholder: 'Slide title' },
      stat1: { kind: 'stat', placeholder: '00' },
      stat2: { kind: 'stat', placeholder: '00' },
      stat3: { kind: 'stat', placeholder: '00' },
      note: { kind: 'text', role: 'caption', placeholder: 'Source / footnote' },
    },
  },
  {
    id: 'stats-grid',
    name: 'Stats Grid',
    description: 'A flexible grid of KPI tiles — add more `statN` slots as needed.',
    defaultBlocks: {
      label: { kind: 'text', role: 'label', placeholder: 'BY THE NUMBERS' },
      title: { kind: 'text', role: 'h1', placeholder: 'Slide title' },
      stat1: { kind: 'stat', placeholder: '00' },
      stat2: { kind: 'stat', placeholder: '00' },
      stat3: { kind: 'stat', placeholder: '00' },
      stat4: { kind: 'stat', placeholder: '00' },
    },
  },
  {
    id: 'team-grid',
    name: 'Team Grid',
    description: 'Headshots with names + roles — up to six members.',
    defaultBlocks: {
      label: { kind: 'text', role: 'label', placeholder: 'THE TEAM' },
      title: { kind: 'text', role: 'h1', placeholder: 'Team & Partners' },
      intro: { kind: 'text', role: 'body', placeholder: 'Who is behind the project — one line.' },
      member1: { kind: 'image' },
      member1Name: { kind: 'text', role: 'h4', placeholder: 'Full Name' },
      member1Role: { kind: 'text', role: 'caption', placeholder: 'Role' },
      member2: { kind: 'image' },
      member2Name: { kind: 'text', role: 'h4', placeholder: 'Full Name' },
      member2Role: { kind: 'text', role: 'caption', placeholder: 'Role' },
      member3: { kind: 'image' },
      member3Name: { kind: 'text', role: 'h4', placeholder: 'Full Name' },
      member3Role: { kind: 'text', role: 'caption', placeholder: 'Role' },
    },
  },
  {
    id: 'process',
    name: 'Process / Steps',
    description: 'Numbered phases with a heading + description per step.',
    defaultBlocks: {
      label: { kind: 'text', role: 'label', placeholder: 'HOW IT WORKS' },
      title: { kind: 'text', role: 'h1', placeholder: 'Our process' },
      step1: { kind: 'text', role: 'h3', placeholder: 'Step 1' },
      step1Body: { kind: 'text', role: 'body', placeholder: 'What happens in step 1' },
      step2: { kind: 'text', role: 'h3', placeholder: 'Step 2' },
      step2Body: { kind: 'text', role: 'body', placeholder: 'What happens in step 2' },
      step3: { kind: 'text', role: 'h3', placeholder: 'Step 3' },
      step3Body: { kind: 'text', role: 'body', placeholder: 'What happens in step 3' },
    },
  },
  {
    id: 'comparison',
    name: 'Comparison',
    description: 'Before/after or A vs. B — two labelled columns + a verdict line.',
    defaultBlocks: {
      label: { kind: 'text', role: 'label', placeholder: 'COMPARISON' },
      title: { kind: 'text', role: 'h1', placeholder: 'Slide title' },
      leftLabel: { kind: 'text', role: 'label', placeholder: 'Before' },
      leftBody: { kind: 'text', role: 'body', placeholder: 'How it was' },
      rightLabel: { kind: 'text', role: 'label', placeholder: 'After' },
      rightBody: { kind: 'text', role: 'body', placeholder: 'How it is now' },
      verdict: { kind: 'text', role: 'h3', placeholder: 'The takeaway' },
    },
  },
  {
    id: 'gallery',
    name: 'Gallery',
    description: 'A grid of images with a title and optional caption.',
    defaultBlocks: {
      label: { kind: 'text', role: 'label', placeholder: 'GALLERY' },
      title: { kind: 'text', role: 'h1', placeholder: 'Slide title' },
      caption: { kind: 'text', role: 'caption', placeholder: 'Optional caption' },
      image1: { kind: 'image' },
      image2: { kind: 'image' },
      image3: { kind: 'image' },
      image4: { kind: 'image' },
    },
  },
  {
    id: 'metrics-hero',
    name: 'Metric Hero',
    description: 'One giant number with a label and a sentence of context.',
    defaultBlocks: {
      label: { kind: 'text', role: 'label', placeholder: 'THE NUMBER' },
      metric: { kind: 'stat', placeholder: '100%' },
      context: { kind: 'text', role: 'h3', placeholder: 'One-sentence context' },
      caption: { kind: 'text', role: 'caption', placeholder: 'Source / footnote' },
    },
  },
  {
    id: 'cta',
    name: 'Call to Action',
    description: 'Closing slide — strong headline + primary and secondary actions.',
    defaultBlocks: {
      tag: { kind: 'text', role: 'label', placeholder: 'GET STARTED' },
      title: { kind: 'text', role: 'display', placeholder: "Let's build it together" },
      subtitle: { kind: 'text', role: 'h3', placeholder: 'Steps to get started' },
      primary: { kind: 'text', role: 'label', placeholder: 'Primary action' },
      secondary: { kind: 'text', role: 'label', placeholder: 'Contact / secondary' },
    },
  },
];

/* ─── Lookup helpers ──────────────────────────────────────────────── */

export function getLayoutMeta(id: LayoutId): LayoutMeta | undefined {
  return LAYOUT_CATALOG.find((m) => m.id === id);
}

/* ─── buildEmptySlide ─────────────────────────────────────────────── */

/**
 * Build a fresh `Slide` for the given layout, pre-wired with empty
 * placeholder blocks for every slot the layout expects.
 *
 * `idCounter` is used as a tie-breaker when several inserts happen in
 * the same millisecond (Date.now() resolution). Pass any monotonically
 * increasing integer — typically the current `deck.slides.length`.
 *
 * Blocks default to:
 *   - text  → `{ kind: 'text', text: '', role }`
 *   - list  → `{ kind: 'list', items: [], marker, role }`
 *   - image → `{ kind: 'image' }` (empty url — picker prompts on click)
 *   - logo  → `{ kind: 'logo', variant: 'auto' }`
 *   - stat  → `{ kind: 'stat', value: '', label: '' }`
 *   - quote → `{ kind: 'quote', text: '' }`
 *
 * `placeholder` from the catalog is stored in the empty block as the
 * initial text/value when authored — the user replaces it via the
 * inline-edit UX. We keep blocks empty so `mode === 'edit'` shows the
 * layout's hint instead of a stale "Lorem ipsum" string.
 */
export function buildEmptySlide(layout: LayoutId, idCounter: number): Slide {
  const meta = getLayoutMeta(layout);
  if (!meta) {
    throw new Error(`buildEmptySlide: unknown layout "${layout}"`);
  }

  const blocks: Record<string, Block> = {};

  for (const [slotId, def] of Object.entries(meta.defaultBlocks)) {
    blocks[slotId] = makeEmptyBlock(def);
  }

  return {
    id: makeSlideId(idCounter),
    layout,
    blocks,
  };
}

/* ─── internals ───────────────────────────────────────────────────── */

function makeEmptyBlock(def: SlotDef): Block {
  switch (def.kind) {
    case 'text':
      // Keep author copy empty so the layout's edit-mode hint shows
      // through; the user types their own text on first click.
      return { kind: 'text', text: '', role: def.role ?? 'body' };
    case 'list':
      return {
        kind: 'list',
        items: def.items ?? [],
        role: def.role ?? 'body',
        marker: def.marker ?? 'dot',
      };
    case 'image':
      return { kind: 'image' };
    case 'logo':
      return { kind: 'logo', variant: 'auto' };
    case 'stat':
      return { kind: 'stat', value: '', label: '' };
    case 'quote':
      return { kind: 'quote', text: '' };
    case 'shape':
      return { kind: 'shape', shape: 'rect' };
    case 'code':
      return { kind: 'code', code: '' };
    case 'chart':
      return {
        kind: 'chart',
        type: 'bar',
        data: { labels: [], datasets: [] },
      };
    case 'iframe':
      return { kind: 'iframe', src: '' };
    case 'spacer':
      return { kind: 'spacer' };
    default: {
      // Exhaustiveness — TypeScript flags any new Block.kind here.
      const _exhaustive: never = def.kind;
      void _exhaustive;
      return { kind: 'text', text: '', role: 'body' };
    }
  }
}

function makeSlideId(counter: number): string {
  // Prefer crypto.randomUUID() when available (jsdom + modern browsers).
  // Fall back to Date.now() + counter so tests / older runtimes still
  // produce unique ids inside a single tick.
  const rnd =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${counter}`;
  return `slide-${rnd}`;
}
