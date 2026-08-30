/**
 * The exporters, in one import.
 *
 * Every builder here is PURE: content + brand (+ rasters the caller
 * already made) in, `ExportFile[]` out. None of them reads the DOM, a
 * store or a service, none of them triggers a download, and none of them
 * decides where in a zip its files belong beyond its own relative names.
 * That is what lets the card menu, the drilldown header, the tile and
 * Export Kit all call the SAME code — which is the whole reason the folder
 * exists, since before it the same deliverable came out differently
 * depending on which button you pressed.
 *
 * The two rasterising helpers (`coverIntoFrame`, and `resizePng` behind
 * `buildProfilePack`) are the one exception and they are injectable, so a
 * test can drive an exporter without a canvas.
 */
export type { ExportFile, RasterInput } from './types';
export { bytesOf, blobOf, textBlob, base64Of, bytesOfBase64, dataUrlOf } from './bytes';
export { PNG_SIGNATURE, isPng, readPngSize } from './png';

export { buildDeckPptx, type DeckPptxOptions } from './deckPptx';
export {
  buildFaviconSet,
  packIco,
  isPngIco,
  ICO_SIZES,
  type FaviconOptions,
  type FaviconResizer,
} from './faviconSet';
export {
  buildSignatureHtml,
  signatureHtml,
  signatureText,
  emailFontStack,
  escapeHtml,
  absoluteUrl,
  telHref,
  type SignatureOptions,
} from './signatureHtml';
export {
  SOCIAL_SIZES,
  PROFILE_SLOTS,
  socialSlot,
  slotsForPlatform,
  fileName as socialFileName,
  coverIntoFrame,
  buildSocialSizePack,
  buildProfilePack,
  type SocialSlot,
  type SafeArea,
  type SlotRenderer,
  type SocialPackOptions,
  type ProfilePackOptions,
} from './socialSizes';
export {
  buildKitReadme,
  buildKitReadmeFile,
  type KitManifest,
  type KitManifestEntry,
  type KitManifestSkip,
} from './readme';
