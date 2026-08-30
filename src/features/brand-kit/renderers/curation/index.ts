import type { FamilyCuration } from './types';
import { curation as businessCards } from './businessCards';
import { curation as letterhead } from './letterhead';
import { curation as invoices } from './invoices';
import { curation as envelope } from './envelope';
import { curation as emailSignature } from './emailSignature';
import { curation as social } from './social';
import { curation as web } from './web';
import { curation as presentations } from './presentations';
import { curation as animations } from './animations';
import { curation as mockups } from './mockups';
import { curation as notecard } from './notecard';
import { curation as qr } from './qr';

export type { FamilyCuration } from './types';

const ALL: FamilyCuration[] = [
  businessCards, letterhead, invoices, envelope, emailSignature, social, web,
  presentations, animations, mockups, notecard, qr,
];

const archived = new Set<string>(ALL.flatMap((c) => c.archived ?? []));
const names: Record<string, string> = Object.assign({}, ...ALL.map((c) => c.names ?? {}));
const tags: Record<string, string[]> = Object.assign({}, ...ALL.map((c) => c.tags ?? {}));

export function isArchived(templateId: string): boolean {
  return archived.has(templateId);
}
export function curatedName(templateId: string): string | undefined {
  return names[templateId];
}
export function tagsFor(templateId: string): string[] {
  return tags[templateId] ?? [];
}
/** Every tag any family declares, for a chip row. */
export function allTags(): string[] {
  return Array.from(new Set(Object.values(tags).flat()));
}
