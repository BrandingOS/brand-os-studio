import type { ContentTypeConfig } from './types';

/**
 * The Brand Kit deliverables, as Design content types.
 *
 * A Brand Kit variant opens in Design through the `template-instance`
 * renderer: its own React artwork, painted from a content object, with no
 * layers. The renderer is chosen by CONTENT TYPE alone
 * (`getDesignRenderer(doc.contentType)`), so a deliverable that is handed
 * to Design must name a content type whose config says
 * `renderer: 'template-instance'` — otherwise the shell opens the document
 * on Fabric, finds no layers, and shows an empty canvas.
 *
 * ## Why these are separate ids and not the existing ones
 *
 * `business-card`, `letterhead`, `social-post`, `presentation`,
 * `profile-icon`, `banner` and `email-signature` are all LIVE Fabric
 * content types today — Phase 4.1's seed templates produce real layered
 * documents under them (`features/templates/seeds`,
 * `brandkit/templateSeeds`). Flipping one of those configs to
 * `template-instance` would repoint every existing document of that type
 * at a renderer that requires a `template-instance` body, which a
 * Fabric-seeded document does not have — it would open as "This design is
 * no longer available". So each Brand Kit family takes a distinct `-kit`
 * id instead, exactly as the hand-off design called for. (`invoice` is the
 * one exception and predates this file: it was flipped in place.)
 *
 * ## Why they share one file
 *
 * They are one generated family. Every field but id, label, icon and
 * dimensions is identical and forced by the renderer: one page, no layer
 * editing, PNG out of the Brand Kit rasteriser, and no reflow — the
 * artwork is hand-positioned, so a resize is a re-render at another
 * aspect, not a redistribution. Twelve near-identical files would hide
 * that they cannot vary.
 *
 * Adding a family = one row in `KIT_TYPES` plus `contentTypeId` on its
 * `DefInput` in `brand-kit/kit/registry.ts`.
 */
type KitType = {
  id: string;
  label: string;
  icon: string;
  width: number;
  height: number;
};

const KIT_TYPES: KitType[] = [
  // Stationery
  { id: 'business-card-kit', label: 'Business card', icon: 'IdCard', width: 1050, height: 600 },
  { id: 'letterhead-kit', label: 'Letterhead', icon: 'FileText', width: 1240, height: 1754 },
  { id: 'envelope-kit', label: 'Envelope', icon: 'Mail', width: 2185, height: 950 },
  // Social
  { id: 'profile-icon-kit', label: 'Profile icon', icon: 'CircleUser', width: 1080, height: 1080 },
  { id: 'social-cover-kit', label: 'Cover', icon: 'RectangleHorizontal', width: 1640, height: 624 },
  { id: 'social-post-kit', label: 'Social post', icon: 'Square', width: 1080, height: 1080 },
  { id: 'social-story-kit', label: 'Story', icon: 'RectangleVertical', width: 1080, height: 1920 },
  // Web
  { id: 'web-page-kit', label: 'Web page', icon: 'Globe', width: 1920, height: 1080 },
  { id: 'email-signature-kit', label: 'Email signature', icon: 'Mail', width: 900, height: 300 },
  // Presentations + motion
  { id: 'presentation-kit', label: 'Presentation', icon: 'Presentation', width: 1920, height: 1080 },
  { id: 'animation-kit', label: 'Animation', icon: 'Play', width: 1080, height: 1080 },
];

function kitConfig(t: KitType): ContentTypeConfig {
  return {
    id: t.id,
    label: t.label,
    icon: t.icon,
    // A template-instance document carries exactly one page.
    pageModel: 'single',
    defaultDimensions: { width: t.width, height: t.height },
    dimensionPresets: [{ label: `Source ${t.width}×${t.height}`, width: t.width, height: t.height }],
    panels: {
      // `templateInstanceRenderer.supportsLayerEditing` is false — there
      // are no layers to list, and the properties panel is the content
      // panel for this document's kind.
      layers: false,
      properties: true,
      pageNavigator: false,
      assets: true,
      masterPages: false,
    },
    // The template-instance export path rasterises the live artwork
    // (`exportArtworkPng`). Offering a format it cannot produce would be
    // a menu item that fails.
    exportFormats: ['png'],
    defaultExportFormat: 'png',
    supportsBrandKit: true,
    supportsMasterPages: false,
    // The designs are absolutely positioned by hand. Resizing them is a
    // re-render at a different aspect, not a reflow of layers.
    resizeStrategy: 'fixed',
    renderer: 'template-instance',
  };
}

/** Every Brand Kit content type, keyed by id — spread into the registry. */
export const BRAND_KIT_CONTENT_TYPES: Record<string, ContentTypeConfig> =
  Object.fromEntries(KIT_TYPES.map((t) => [t.id, kitConfig(t)]));

/** The ids, for tests and for the Brand Kit registry's own cross-check. */
export const BRAND_KIT_CONTENT_TYPE_IDS: ReadonlyArray<string> = KIT_TYPES.map((t) => t.id);
