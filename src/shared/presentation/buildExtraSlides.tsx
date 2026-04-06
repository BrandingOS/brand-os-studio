/**
 * Convert user-added ExtraSlide entries into SlideData[] for the editor.
 *
 * Each ExtraSlide stores a layout id and any data overrides. We map the
 * layout id to one of the 10 reusable page components and pass the
 * stored data plus the active style/brand at render time.
 */
import type { SlideData, SlideRenderProps } from '@/shared/editor';
import type { PresentationStyle } from './styles';
import type { ExtraSlide } from './presentationDocsStore';
import {
  CoverPage,
  SectionDividerPage,
  TwoColumnPage,
  TwoColumnReversePage,
  FullBleedImagePage,
  ThreeColumnPage,
  QuotePage,
  StatsPage,
  ListPage,
  ClosingPage,
  type PageProps,
} from './pages';

interface LayoutInfo {
  id: ExtraSlide['layout'];
  name: string;
  description: string;
  Component: React.ComponentType<PageProps>;
  /** Default data when first added */
  defaultData: () => Partial<PageProps>;
}

export const SLIDE_LAYOUTS: LayoutInfo[] = [
  {
    id: 'cover',
    name: 'Cover',
    description: 'Title slide with subtitle and logo',
    Component: CoverPage,
    defaultData: () => ({ title: 'New Cover', subtitle: 'Subtitle here' }),
  },
  {
    id: 'section',
    name: 'Section Divider',
    description: 'Big section number with label',
    Component: SectionDividerPage,
    defaultData: () => ({ sectionNumber: '01', sectionLabel: 'New Section' }),
  },
  {
    id: 'two-col',
    name: 'Two Column',
    description: 'Text on the left, image/accent on the right',
    Component: TwoColumnPage,
    defaultData: () => ({
      sectionLabel: 'Section',
      title: 'Title goes here',
      subtitle: 'Subtitle text',
      body: 'Body text describing this section in more detail.',
    }),
  },
  {
    id: 'two-col-reverse',
    name: 'Two Column Reverse',
    description: 'Image on the left, text on the right',
    Component: TwoColumnReversePage,
    defaultData: () => ({
      sectionLabel: 'Section',
      title: 'Title goes here',
      body: 'Body text describing this section.',
    }),
  },
  {
    id: 'full-bleed',
    name: 'Full Bleed',
    description: 'Full-bleed image with title overlay',
    Component: FullBleedImagePage,
    defaultData: () => ({ title: 'Full Bleed Title', subtitle: 'Optional subtitle' }),
  },
  {
    id: 'three-col',
    name: 'Three Column',
    description: 'Grid of three cards',
    Component: ThreeColumnPage,
    defaultData: () => ({
      sectionLabel: 'Section',
      title: 'Three Columns',
      columns: [
        { title: 'First', body: 'Description for the first column.' },
        { title: 'Second', body: 'Description for the second column.' },
        { title: 'Third', body: 'Description for the third column.' },
      ],
    }),
  },
  {
    id: 'quote',
    name: 'Quote',
    description: 'Centered pull quote with attribution',
    Component: QuotePage,
    defaultData: () => ({
      quote: 'A memorable quote that captures the moment.',
      quoteAuthor: 'Author Name',
    }),
  },
  {
    id: 'stats',
    name: 'Stats / Metrics',
    description: 'Grid of key metrics',
    Component: StatsPage,
    defaultData: () => ({
      sectionLabel: 'Numbers',
      title: 'Key Metrics',
      stats: [
        { value: '100%', label: 'Metric A' },
        { value: '24h', label: 'Metric B' },
        { value: '5x', label: 'Metric C' },
        { value: '4.9', label: 'Metric D' },
      ],
    }),
  },
  {
    id: 'list',
    name: 'Numbered List',
    description: 'Title on the left, numbered items on the right',
    Component: ListPage,
    defaultData: () => ({
      sectionLabel: 'List',
      title: 'Numbered List',
      items: [
        { title: 'First item', description: 'Description for the first item.' },
        { title: 'Second item', description: 'Description for the second item.' },
        { title: 'Third item', description: 'Description for the third item.' },
      ],
    }),
  },
  {
    id: 'closing',
    name: 'Closing',
    description: 'Thank you / contact slide',
    Component: ClosingPage,
    defaultData: () => ({ title: 'Thank You', subtitle: 'Contact details below' }),
  },
];

export function getLayoutInfo(layout: ExtraSlide['layout']): LayoutInfo {
  return SLIDE_LAYOUTS.find((l) => l.id === layout) || SLIDE_LAYOUTS[0];
}

/**
 * Convert an ExtraSlide into a SlideData ready for the editor.
 */
export function buildExtraSlide(extra: ExtraSlide, style: PresentationStyle, index: number): SlideData {
  const info = getLayoutInfo(extra.layout);
  const Component = info.Component;
  const defaults = info.defaultData();
  // Stored data overrides defaults
  const data = { ...defaults, ...extra.data };

  return {
    id: extra.id,
    name: `${info.name} ${index + 1}`,
    render: (rp: SlideRenderProps) => (
      <Component
        {...(data as any)}
        style={style}
        brand={rp.brand}
        pageNumber={rp.pageNumber}
        totalPages={rp.totalPages}
        orientation={rp.orientation}
        aspectRatioValue={rp.aspectRatioValue}
        settings={rp.settings}
      />
    ),
  };
}

/** Build all extra slides as SlideData[] */
export function buildExtraSlides(extras: ExtraSlide[], style: PresentationStyle): SlideData[] {
  return extras.map((e, i) => buildExtraSlide(e, style, i));
}
