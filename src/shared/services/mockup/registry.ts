// Mockup registry. Adding a new mockup = one file in ./templates/ exporting
// a MockupTemplate, plus one import + one array entry below.
//
// Per Hamza (Q10): scope = all 12 from spec §3.2 Screen 5 list. This registry
// is the single source of truth — the Brand Kit screen, the download-zip
// helper, and the PDF guidelines all read from it.

import type { MockupTemplate } from './types';
import { businessCard } from './templates/business-card';
import { tshirt } from './templates/tshirt';
import { storefront } from './templates/storefront';
import { mobileIcon } from './templates/mobile-icon';
import { instagramPost } from './templates/instagram-post';
import { instagramStory } from './templates/instagram-story';
import { billboard } from './templates/billboard';
import { laptopSticker } from './templates/laptop-sticker';
import { emailSignature } from './templates/email-signature';
import { letterhead } from './templates/letterhead';
import { coffeeMug } from './templates/coffee-mug';
import { toteBag } from './templates/tote-bag';

export const MOCKUP_TEMPLATES: MockupTemplate[] = [
  businessCard,
  tshirt,
  storefront,
  mobileIcon,
  instagramPost,
  instagramStory,
  billboard,
  laptopSticker,
  emailSignature,
  letterhead,
  coffeeMug,
  toteBag,
];

export function findMockup(id: string): MockupTemplate | undefined {
  return MOCKUP_TEMPLATES.find((m) => m.id === id);
}

export type { MockupTemplate, BrandContext } from './types';
