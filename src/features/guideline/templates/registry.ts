/**
 * The guideline template registry.
 *
 * MVP has exactly ONE template, and the point of this file is that adding a
 * second is one entry — not a refactor. Everything downstream (the workspace
 * card, the editor route, the persistence key) reads the template rather than
 * hard-coding the editorial deck, so the multi-template future costs a push to
 * this array plus a `buildSlides` function.
 *
 * Deliberately NOT built yet: template categories, a picker modal, per-template
 * settings, user-authored templates. `EditorWorkspace` already accepts
 * `templates` / `onTemplateChange` / `onOpenTemplatePicker`, so those land
 * against an existing seam when they are actually wanted.
 */
import type { Brand } from '@/shared/types/brand';
import type { SlideData } from '@/shared/editor';
import { buildEditorSlides } from '@/features/guidelines/editor/buildSlides';

export interface GuidelineTemplate {
  id: string;
  name: string;
  /** One line, shown on the workspace card. */
  tagline: string;
  description: string;
  /**
   * The chapters this template covers, in order. Declared rather than derived
   * from the slide list because it is template METADATA — the workspace needs
   * it before a brand has resolved, and section dividers are an implementation
   * detail of the deck.
   */
  sections: string[];
  /**
   * Prefix for the editor's persistence key; the host appends the brand id.
   *
   * 'brand-guides' is load-bearing, not cosmetic: the previous
   * /b/:slug/brand-guides page used `brand-guides-${brand.id}`, and slide
   * snapshots are stored under exactly that key. Changing it would silently
   * orphan every edit anyone has already made to their guideline deck.
   */
  editorKeyPrefix: string;
  buildSlides: (brand: Brand) => SlideData[];
}

export const EDITORIAL_GUIDELINE: GuidelineTemplate = {
  id: 'editorial',
  name: 'Editorial',
  tagline: 'A complete, presentation-ready brand book.',
  // No page count in the copy — the card reads the real number off the built
  // deck, and two sources for one fact drift the moment a slide is added.
  description:
    'Strategy, logo, colour, typography, voice and applications — every page already '
    + 'filled in with this brand’s own data. Edit any of them directly on the canvas.',
  sections: [
    'Brand Overview',
    'Logo System',
    'Colour System',
    'Typography',
    'Voice & Tone',
    'Applications',
  ],
  editorKeyPrefix: 'brand-guides',
  buildSlides: buildEditorSlides,
};

export const GUIDELINE_TEMPLATES: GuidelineTemplate[] = [EDITORIAL_GUIDELINE];

/** The one a bare `/b/:slug/guideline` opens. */
export const DEFAULT_GUIDELINE_TEMPLATE_ID = EDITORIAL_GUIDELINE.id;

export function getGuidelineTemplate(id: string | undefined): GuidelineTemplate | undefined {
  if (!id) return undefined;
  return GUIDELINE_TEMPLATES.find((t) => t.id === id);
}

/** The persistence key an editor instance uses for this brand's template. */
export function guidelineEditorKey(template: GuidelineTemplate, brandId: string): string {
  return `${template.editorKeyPrefix}-${brandId}`;
}
