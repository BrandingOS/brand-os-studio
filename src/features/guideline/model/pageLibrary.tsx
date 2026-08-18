/**
 * The guideline page library.
 *
 * One entry per page TYPE, one design per type. This is the list the "Add
 * page" library renders and the list `buildDefaultDocument` draws from, so a
 * page can never exist in one and not the other.
 *
 * Two rules hold this file together:
 *
 * 1. **A type id is a persistence key.** The first instance of a type takes
 *    the type id as its instance id, and slide edits live in IndexedDB under
 *    `${editorKey}::${instanceId}`. These ids are exactly the slide ids the
 *    previous deck used, so every edit anyone has already made still loads.
 *    Renaming a type id silently discards those edits.
 * 2. **The renderers are not ours.** They live in `features/guidelines/` — the
 *    legacy family — and they are the strongest guideline pages in the repo.
 *    This file is a catalogue over them, not a reimplementation of them.
 *
 * Multiple layouts per type is the obvious next step and is deliberately NOT
 * built: it lands as a `variant` field on the instance plus a `variants` map
 * here, with no change to the document, the store, or any panel.
 */
import type { Brand } from '@/shared/types/brand';
import type { TemplateLayout } from '@/shared/editor';
import {
  CoverHyperHyve, SectionDivider, ContentPage, ContentPageDark, ClosingTemplatePage,
} from '@/features/guidelines/pages/templates/TemplatePages';
import {
  BrandPurposePage, LogoConstructionPage, ColorRatioPage,
  GradientSystemPage, DarkModePage, BrandArchetypePage,
  PatternSystemPage, StationeryMockupPage, DigitalProductPage,
  TouchpointMapPage, MotionPrinciplesPage,
} from '@/features/guidelines/pages/templates/FancyPages';
import {
  BrandUniversePage, TypographySpecimenPage, VoiceDNAPage,
  IconGridPage, BrandManifestoPage, PhotographyMoodPage, ColophonPage,
} from '@/features/guidelines/pages/templates/FancyPages2';
import type { GuidelinePage } from './document';

/** Which part of the brand a page draws from — drives the sidebar's source block. */
export type BrandSource = 'logo' | 'colors' | 'typography' | 'voice' | 'strategy';

export type PageCategoryId =
  | 'structure' | 'introduction' | 'logo' | 'colors'
  | 'typography' | 'imagery' | 'motion' | 'voice' | 'applications';

export interface PageCategory {
  id: PageCategoryId;
  name: string;
  description: string;
}

export const PAGE_CATEGORIES: PageCategory[] = [
  { id: 'structure', name: 'Structure', description: 'Covers, chapter dividers and the closing page' },
  { id: 'introduction', name: 'Introduction', description: 'Who the brand is and what it stands for' },
  { id: 'logo', name: 'Logo', description: 'The mark and how it is built' },
  { id: 'colors', name: 'Colours', description: 'Palette, proportion and behaviour' },
  { id: 'typography', name: 'Typography', description: 'Typefaces and hierarchy' },
  { id: 'imagery', name: 'Imagery', description: 'Photography, pattern and iconography' },
  { id: 'motion', name: 'Motion', description: 'How the brand moves' },
  { id: 'voice', name: 'Voice & Tone', description: 'How the brand sounds' },
  { id: 'applications', name: 'Applications', description: 'The brand in the world' },
];

export interface PageRenderContext {
  brand: Brand;
  layout: TemplateLayout;
  pageNumber: number;
  totalPages: number;
  /** The instance — carries the title/subtitle a user typed. */
  page: GuidelinePage;
  /** 1-based position among section dividers, for the big chapter number. */
  sectionIndex: number;
}

export interface GuidelinePageType {
  id: string;
  name: string;
  category: PageCategoryId;
  /** One line, shown on the library card and under the page in the outline. */
  description: string;
  brandSources: BrandSource[];
  /**
   * True when `title` / `subtitle` are rendered ON the page rather than only
   * naming it in the outline. The page panel changes its labels accordingly,
   * so it never promises an edit the page will not show.
   */
  titleIsContent?: boolean;
  defaultTitle?: string;
  defaultSubtitle?: string;
  render: (ctx: PageRenderContext) => React.ReactNode;
}

/** Props every legacy renderer takes. */
function base(ctx: PageRenderContext) {
  return {
    brand: ctx.brand,
    layout: ctx.layout,
    pageNumber: ctx.pageNumber,
    totalPages: ctx.totalPages,
  };
}

export const PAGE_TYPES: GuidelinePageType[] = [
  // ── Structure ──────────────────────────────────────────────
  {
    id: 'cover',
    name: 'Cover',
    category: 'structure',
    description: 'The title page, in the brand’s own colour.',
    brandSources: ['logo', 'colors'],
    render: (c) => <CoverHyperHyve {...base(c)} />,
  },
  {
    id: 'section',
    name: 'Chapter divider',
    category: 'structure',
    description: 'A numbered break between chapters.',
    brandSources: ['colors'],
    titleIsContent: true,
    defaultTitle: 'New chapter',
    render: (c) => (
      <SectionDivider
        {...base(c)}
        sectionNumber={String(c.sectionIndex)}
        sectionTitle={c.page.title ?? 'New chapter'}
        sectionSubtitle={c.page.subtitle}
      />
    ),
  },
  {
    id: 'closing',
    name: 'Closing',
    category: 'structure',
    description: 'A sign-off page to end the document.',
    brandSources: ['logo', 'colors'],
    render: (c) => <ClosingTemplatePage {...base(c)} />,
  },

  // ── Introduction ───────────────────────────────────────────
  {
    id: 'intro',
    name: 'Introduction',
    category: 'introduction',
    description: 'Mission and vision, side by side.',
    brandSources: ['strategy'],
    titleIsContent: true,
    defaultTitle: 'Introduction',
    render: (c) => {
      const strategy = c.brand.guidelines?.strategy;
      return (
        <ContentPage {...base(c)} sectionName="Brand Overview" title={c.page.title ?? 'Introduction'}>
          <div className="grid grid-cols-2 gap-6 h-full">
            <div>
              <h4 className="text-[9px] font-semibold uppercase tracking-wider opacity-30 mb-1">Mission</h4>
              <p className="text-[clamp(10px,1vw,13px)] leading-relaxed opacity-70">
                {strategy?.mission || `${c.brand.name} exists to deliver value.`}
              </p>
            </div>
            <div>
              <h4 className="text-[9px] font-semibold uppercase tracking-wider opacity-30 mb-1">Vision</h4>
              <p className="text-[clamp(10px,1vw,13px)] leading-relaxed opacity-70">
                {strategy?.vision || 'Leading our industry.'}
              </p>
            </div>
          </div>
        </ContentPage>
      );
    },
  },
  {
    id: 'values',
    name: 'Core values',
    category: 'introduction',
    description: 'The brand’s values as a numbered grid.',
    brandSources: ['strategy', 'colors'],
    titleIsContent: true,
    defaultTitle: 'Core Values',
    render: (c) => {
      const values = c.brand.guidelines?.strategy?.values || ['Quality', 'Innovation', 'Trust'];
      return (
        <ContentPageDark {...base(c)} sectionName="Brand Overview" title={c.page.title ?? 'Core Values'}>
          <div className="grid grid-cols-3 gap-3 mt-2">
            {values.map((v, i) => (
              <div key={v} className="rounded-lg p-3" style={{ backgroundColor: `${c.brand.primaryColor}15` }}>
                <span className="text-[18px] font-bold opacity-10">{i + 1}.</span>
                <p className="text-[11px] font-semibold text-white mt-1">{v}</p>
              </div>
            ))}
          </div>
        </ContentPageDark>
      );
    },
  },
  {
    id: 'purpose',
    name: 'Brand purpose',
    category: 'introduction',
    description: 'The positioning statement, set as a full-page quote.',
    brandSources: ['strategy', 'colors'],
    render: (c) => <BrandPurposePage {...base(c)} />,
  },
  {
    id: 'archetype',
    name: 'Brand archetype',
    category: 'introduction',
    description: 'Personality traits plotted against the archetype.',
    brandSources: ['strategy', 'voice'],
    render: (c) => <BrandArchetypePage {...base(c)} />,
  },
  {
    id: 'manifesto',
    name: 'Manifesto',
    category: 'introduction',
    description: 'A statement page in the brand’s own words.',
    brandSources: ['strategy', 'voice'],
    render: (c) => <BrandManifestoPage {...base(c)} />,
  },
  {
    id: 'colophon',
    name: 'Colophon',
    category: 'introduction',
    description: 'Document credits, version and contact.',
    brandSources: ['strategy'],
    render: (c) => <ColophonPage {...base(c)} />,
  },

  // ── Logo ───────────────────────────────────────────────────
  {
    id: 'logo-grid',
    name: 'Logo construction',
    category: 'logo',
    description: 'The mark on a construction grid with clear space.',
    brandSources: ['logo', 'colors'],
    render: (c) => <LogoConstructionPage {...base(c)} />,
  },

  // ── Colours ────────────────────────────────────────────────
  {
    id: 'color-ratio',
    name: 'Colour ratio',
    category: 'colors',
    description: 'Palette with the proportion each colour should hold.',
    brandSources: ['colors'],
    render: (c) => <ColorRatioPage {...base(c)} />,
  },
  {
    id: 'gradients',
    name: 'Gradient system',
    category: 'colors',
    description: 'Gradients derived from the palette.',
    brandSources: ['colors'],
    render: (c) => <GradientSystemPage {...base(c)} />,
  },
  {
    id: 'dark-mode',
    name: 'Dark mode',
    category: 'colors',
    description: 'How the palette behaves on dark surfaces.',
    brandSources: ['colors'],
    render: (c) => <DarkModePage {...base(c)} />,
  },

  // ── Typography ─────────────────────────────────────────────
  {
    id: 'type-specimen',
    name: 'Type specimen',
    category: 'typography',
    description: 'The typeface at every size in the hierarchy.',
    brandSources: ['typography'],
    render: (c) => <TypographySpecimenPage {...base(c)} />,
  },

  // ── Imagery ────────────────────────────────────────────────
  {
    id: 'photo-mood',
    name: 'Visual direction',
    category: 'imagery',
    description: 'The photographic mood and what to avoid.',
    brandSources: ['colors'],
    render: (c) => <PhotographyMoodPage {...base(c)} />,
  },
  {
    id: 'patterns',
    name: 'Pattern system',
    category: 'imagery',
    description: 'Graphic patterns built from the brand’s shapes.',
    brandSources: ['colors'],
    render: (c) => <PatternSystemPage {...base(c)} />,
  },
  {
    id: 'icon-grid',
    name: 'Icon system',
    category: 'imagery',
    description: 'Icon style, weight and grid.',
    brandSources: ['colors'],
    render: (c) => <IconGridPage {...base(c)} />,
  },

  // ── Motion ─────────────────────────────────────────────────
  {
    id: 'motion',
    name: 'Motion principles',
    category: 'motion',
    description: 'Easing, duration and how the brand animates.',
    brandSources: ['colors'],
    render: (c) => <MotionPrinciplesPage {...base(c)} />,
  },

  // ── Voice ──────────────────────────────────────────────────
  {
    id: 'voice-dna',
    name: 'Voice DNA',
    category: 'voice',
    description: 'Tone sliders and do/don’t writing examples.',
    brandSources: ['voice'],
    render: (c) => <VoiceDNAPage {...base(c)} />,
  },

  // ── Applications ───────────────────────────────────────────
  {
    id: 'stationery',
    name: 'Stationery',
    category: 'applications',
    description: 'Business card, letterhead and envelope.',
    brandSources: ['logo', 'colors'],
    render: (c) => <StationeryMockupPage {...base(c)} />,
  },
  {
    id: 'digital',
    name: 'Digital product',
    category: 'applications',
    description: 'The brand applied to an app or web UI.',
    brandSources: ['logo', 'colors', 'typography'],
    render: (c) => <DigitalProductPage {...base(c)} />,
  },
  {
    id: 'touchpoints',
    name: 'Touchpoints',
    category: 'applications',
    description: 'Every surface the brand appears on, mapped.',
    brandSources: ['colors'],
    render: (c) => <TouchpointMapPage {...base(c)} />,
  },
  {
    id: 'universe',
    name: 'Brand universe',
    category: 'applications',
    description: 'The whole system on one page.',
    brandSources: ['logo', 'colors', 'typography'],
    render: (c) => <BrandUniversePage {...base(c)} />,
  },
];

const BY_ID = new Map(PAGE_TYPES.map((t) => [t.id, t]));

export function getPageType(id: string): GuidelinePageType | undefined {
  return BY_ID.get(id);
}

export function pageTypesByCategory(category: PageCategoryId): GuidelinePageType[] {
  return PAGE_TYPES.filter((t) => t.category === category);
}

export const BRAND_SOURCE_LABEL: Record<BrandSource, string> = {
  logo: 'Logo',
  colors: 'Colours',
  typography: 'Typography',
  voice: 'Voice & tone',
  strategy: 'Strategy',
};
