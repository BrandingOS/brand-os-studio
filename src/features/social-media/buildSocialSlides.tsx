/**
 * Builds editor slides from a chosen social media platform/format.
 * Each format becomes a single editable slide at the correct aspect ratio.
 */
import type { SlideData, SlideRenderProps } from '@/shared/editor';
import type { Brand } from '@/shared/types/brand';
import { logoUrl } from '@/shared/brand/logoUrl';
import type { SocialMediaSize } from './types';
import { getStyleById } from '@/shared/presentation/styles';
import {
  CoverPage,
  FullBleedImagePage,
  TwoColumnPage,
  ThreeColumnPage,
} from '@/shared/presentation/pages';

/**
 * Build slides for a social media format.
 * Returns multiple variations using different page layouts so the user
 * can pick what suits their content.
 */
export function buildSocialSlides(brand: Brand, size: SocialMediaSize, styleId = 'rounded'): SlideData[] {
  const style = getStyleById(styleId);
  const label = size.label;

  return [
    // Slide 1: Hero / Cover variation
    {
      id: 'hero',
      name: `${label} — Hero`,
      render: (rp: SlideRenderProps) => (
        <CoverPage
          style={style}
          brand={rp.brand}
          title={brand.name}
          subtitle={brand.tagline || `${brand.tone || 'Modern'} & memorable`}
          logoUrl={logoUrl(brand)}
          orientation={rp.orientation}
          aspectRatioValue={rp.aspectRatioValue}
          settings={rp.settings}
        />
      ),
    },
    // Slide 2: Image-based design
    {
      id: 'image',
      name: `${label} — Image`,
      render: (rp: SlideRenderProps) => (
        <FullBleedImagePage
          style={style}
          brand={rp.brand}
          title={brand.name}
          subtitle={brand.tagline || ''}
          imageUrl={logoUrl(brand)}
          orientation={rp.orientation}
          aspectRatioValue={rp.aspectRatioValue}
          settings={rp.settings}
        />
      ),
    },
    // Slide 3: Two-column with text + image
    {
      id: 'split',
      name: `${label} — Split`,
      render: (rp: SlideRenderProps) => (
        <TwoColumnPage
          style={style}
          brand={rp.brand}
          sectionLabel="Featured"
          title={brand.name}
          subtitle={brand.tagline || 'Coming soon'}
          body={brand.guidelines?.strategy?.mission || 'Our story, told beautifully.'}
          imageUrl={logoUrl(brand)}
          orientation={rp.orientation}
          aspectRatioValue={rp.aspectRatioValue}
          settings={rp.settings}
        />
      ),
    },
    // Slide 4: Three column grid (good for tips, features, etc.)
    {
      id: 'grid',
      name: `${label} — Grid`,
      render: (rp: SlideRenderProps) => (
        <ThreeColumnPage
          style={style}
          brand={rp.brand}
          sectionLabel="Features"
          title={brand.name}
          columns={[
            { title: 'Quality', body: 'Crafted with care.' },
            { title: 'Speed', body: 'Delivered fast.' },
            { title: 'Trust', body: 'Backed by results.' },
          ]}
          orientation={rp.orientation}
          aspectRatioValue={rp.aspectRatioValue}
          settings={rp.settings}
        />
      ),
    },
  ];
}
