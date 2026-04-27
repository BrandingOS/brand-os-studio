/**
 * Deck OS v2 — core types.
 *
 * The v2 system replaces four parallel deck implementations
 * (pitch-deck, case-study-deck, logo-presentation, the legacy
 * shared/presentation registry) with one engine where:
 *   - Slides are TYPED DATA, not React components.
 *   - Layouts are a shared library (~15) read by SlideRenderer.
 *   - Templates compose layouts + content schemas.
 *   - The brand-aware deck theme system (already shipped under
 *     `src/shared/presentation/theme/`) provides every visual
 *     token. No hardcoded colors / fonts in any layout.
 *
 * See docs/superpowers/specs/2026-04-27-deck-os-design.md.
 */

import type { DeckTypeRole, PresentationTheme } from '@/shared/presentation/theme/types';

/* ─── Layout identifiers ───────────────────────────────────────────── */

export type LayoutId =
  | 'cover'
  | 'section-divider'
  | 'title-body'
  | 'bullets'
  | 'two-column'
  | 'image-text'
  | 'quote'
  | 'stats-3'
  | 'stats-grid'
  | 'team-grid'
  | 'process'
  | 'comparison'
  | 'gallery'
  | 'metrics-hero'
  | 'cta';

/* ─── Block primitives ─────────────────────────────────────────────── */

/**
 * A `Block` is the smallest piece of slide content. Every layout
 * declares the slot ids it expects (e.g. cover declares `'title' |
 * 'subtitle' | 'image' | 'logo'`); the slide's `blocks` map fills
 * those slots with values.
 */
export type Block =
  | TextBlock
  | ListBlock
  | ImageBlock
  | LogoBlock
  | ShapeBlock
  | StatBlock
  | QuoteBlock
  | CodeBlock
  | ChartBlock
  | EmbedBlock
  | SpacerBlock;

export interface TextBlock {
  kind: 'text';
  text: string;
  /** Typography role — drives size/weight/color via deck-theme tokens. */
  role: DeckTypeRole;
  /** Optional inline overrides. Stay close to authored brand defaults
   *  unless an explicit per-element tweak is needed. */
  align?: 'start' | 'center' | 'end';
  weight?: number;
  color?: string;
}

export interface ListBlock {
  kind: 'list';
  items: string[];
  role: DeckTypeRole;
  ordered?: boolean;
  /** Bullet character / icon — defaults to a brand accent dot. */
  marker?: 'dot' | 'check' | 'arrow' | 'number' | 'none';
}

export interface ImageBlock {
  kind: 'image';
  /** Final URL the slide renders. Empty string = empty placeholder
   *  (artwork picker prompts on click). */
  url?: string;
  alt?: string;
  fit?: 'cover' | 'contain';
  /** Source provenance kept for attribution + reset. */
  source?: 'upload' | 'unsplash' | 'illustration' | 'brand-asset';
  /** AI-generation hint — what kind of image to surface in the picker. */
  hint?: string;
}

export interface LogoBlock {
  kind: 'logo';
  /** Which brand-logo variant to render. Resolved via
   *  `pickLogoOnBackground(brand, currentBg)` so the variant always
   *  reads against the surrounding surface. */
  variant?: 'auto' | 'primary' | 'mono-light' | 'mono-dark' | 'icon-only';
  size?: number;
}

export interface ShapeBlock {
  kind: 'shape';
  shape: 'circle' | 'rect' | 'pill' | 'line';
  fill?: string;            // defaults to var(--deck-accent)
  stroke?: string;
  size?: number;
  width?: number;
  height?: number;
}

export interface StatBlock {
  kind: 'stat';
  value: string;            // formatted display (e.g. "+2,500")
  label: string;
  trend?: 'up' | 'down' | 'flat';
  caption?: string;
}

export interface QuoteBlock {
  kind: 'quote';
  text: string;
  author?: string;
  role?: string;
  avatarUrl?: string;
}

export interface CodeBlock {
  kind: 'code';
  language?: string;
  code: string;
  showLineNumbers?: boolean;
}

export interface ChartBlock {
  kind: 'chart';
  type: 'bar' | 'line' | 'pie' | 'donut' | 'area';
  data: ChartData;
  caption?: string;
}

export interface ChartData {
  /** Series labels (e.g. months, quarters). */
  labels: string[];
  /** One or more data series. */
  datasets: Array<{ label: string; values: number[]; color?: string }>;
}

export interface EmbedBlock {
  kind: 'iframe';
  src: string;
  title?: string;
  aspectRatio?: number;     // 16/9 default
}

export interface SpacerBlock {
  kind: 'spacer';
  height?: number;          // px
}

/* ─── Slot identifier ──────────────────────────────────────────────── */

/**
 * Slot ids are layout-defined strings. We keep them as plain strings
 * and let each layout declare its accepted ids — typing every layout's
 * slots in the union here would require constant updates and would
 * not catch typos as cleanly.
 */
export type SlotId = string;

/* ─── Per-block position override ──────────────────────────────────── */

/**
 * When the user drags a block (in edit mode), we record an absolute
 * position override here. The layout's default placement is used when
 * no override is present.
 */
export interface BlockPosition {
  /** Pixel offsets relative to the slide canvas (1920×1080). */
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
}

/* ─── Slide ─────────────────────────────────────────────────────────── */

export interface Slide {
  id: string;
  layout: LayoutId;
  blocks: Record<SlotId, Block>;
  /** Per-slide block-position overrides. */
  positions?: Record<SlotId, BlockPosition>;
  /** Per-slide theme overrides — shadow these onto deck.theme. */
  themeOverride?: Partial<PresentationTheme>;
  /** Hidden from export but kept in the doc. */
  hidden?: boolean;
  /** Speaker / AI prompt source notes. */
  notes?: string;
  /** Section name shown in the chrome (e.g. "Introduction"). */
  section?: string;
}

/* ─── Template ──────────────────────────────────────────────────────── */

export type TemplateCategory = 'pitch' | 'showcase' | 'report' | 'narrative' | 'casual';

export interface Template {
  id: string;
  name: string;
  description: string;
  /** Public path to a thumbnail image. */
  thumbnail?: string;
  category: TemplateCategory;
  /** Slide blueprint — what layouts in what order, with their
   *  default content (placeholder text the user can replace) and
   *  per-slot AI-generation hints. */
  slides: Array<{
    layout: LayoutId;
    section?: string;
    blocks: Record<SlotId, Block>;
    aiHints?: Record<SlotId, string>;
  }>;
  /** Theme this template ships with. Merges over brand defaults. */
  defaultTheme?: Partial<PresentationTheme>;
}

/* ─── Deck ──────────────────────────────────────────────────────────── */

export interface Deck {
  id: string;
  brandId: string;
  /** Which template the deck was built from. Useful for re-runs. */
  templateId?: string;
  title: string;
  slides: Slide[];
  /** Resolved theme: brand defaults + template defaults + user edits. */
  theme: PresentationTheme;
  /** Provenance — useful for the dashboard. */
  origin: 'template' | 'ai-script' | 'duplicated' | 'imported' | 'blank';
  /** When `origin === 'ai-script'`, the prompt that built it. */
  scriptSource?: { script: string; promptVersion: string };
  /** Bumped on every save so snapshots can detect change. */
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/* ─── Layout component contract ────────────────────────────────────── */

/**
 * Every layout under `./layouts/` exports a `LayoutComponent` matching
 * this signature. The renderer registers them all in `./layouts/index.ts`
 * keyed by `LayoutId`.
 */
export interface LayoutComponentProps {
  blocks: Record<SlotId, Block>;
  positions?: Record<SlotId, BlockPosition>;
  /** Stable slide id — forwarded to slot primitives so edits route
   *  back to `editCtx.setBlock(slideId, slotId, …)`. */
  slideId: string;
  /** 1-based slide index for chrome / page-number rendering. */
  index: number;
  total: number;
  /** Section name shown in chrome. Optional. */
  section?: string;
  /** Edit mode — layouts can show empty-slot placeholders here. */
  mode: DeckMode;
}

export type DeckMode = 'present' | 'edit' | 'thumbnail';

export type LayoutComponent = (props: LayoutComponentProps) => JSX.Element;

/* ─── Helpers ──────────────────────────────────────────────────────── */

/**
 * Type-guard helpers — every block consumer should narrow before reading.
 * Saves boilerplate at call sites.
 */
export const isText  = (b: Block | undefined): b is TextBlock  => !!b && b.kind === 'text';
export const isList  = (b: Block | undefined): b is ListBlock  => !!b && b.kind === 'list';
export const isImage = (b: Block | undefined): b is ImageBlock => !!b && b.kind === 'image';
export const isLogo  = (b: Block | undefined): b is LogoBlock  => !!b && b.kind === 'logo';
export const isStat  = (b: Block | undefined): b is StatBlock  => !!b && b.kind === 'stat';
export const isQuote = (b: Block | undefined): b is QuoteBlock => !!b && b.kind === 'quote';
