/**
 * Can this variant be handed to the Design editor?
 *
 * Only if its renderer actually BINDS content. A design that binds
 * declares each piece of its text through `<Bind path=…>`, so an edit made
 * in Design's properties panel reaches the artwork. A design that does not
 * paints its own literals: the panel would accept the edit, the adapter
 * would commit it, autosave would persist it — and the artwork would never
 * change. Silently. Gating the actions is the alternative to that.
 *
 * ## This used to be a table, and the table was the bug
 *
 * The first version keyed a hand-written map by template type, with one
 * entry per family and a per-index predicate inside it. It was written
 * when exactly one family bound content, and it stayed written that way
 * after ten more families were converted — so `Use Template` and `Edit
 * Template` were dark on every design in the kit except an invoice, and
 * nothing failed to say so.
 *
 * A hand-kept list of "which designs were converted" cannot stay true,
 * because it is a SECOND record of a fact the code already holds. The
 * answer is now DERIVED from the two records that decide it:
 *
 *   1. **`contentKindForTemplateType(type)`** — the content model's own
 *      answer to "what does a design of this type contain". A family with
 *      no kind was never put on the content model, so the dispatcher hands
 *      its renderer no `content` prop and there is nothing to bind. Guides
 *      and the brand-asset cards are the live examples: both are drawn
 *      from the BRAND, not from a deliverable's content.
 *   2. **`isArchived(id)`** (`renderers/curation`) — a family's own answer
 *      to "is this design still offered". The conversion waves kept the
 *      designs they could bind and archived the ones they could not, so
 *      "kept" and "binds" are the same set by construction. An archived id
 *      is refused here as well as hidden, because a saved customization
 *      can still name one.
 *
 * The third condition is not a record but a routing fact: a legacy id with
 * no `-ext-N` suffix goes through `renderLegacyTemplate`, which takes no
 * content at all.
 *
 * What keeps this honest is `contentBinding.test.tsx`: it RENDERS every
 * variant of every family that has a content kind and asserts a
 * `[data-bind]` region appears exactly where this function says it should.
 * The predicate cannot drift from the renderers without that test going
 * red — which is the property the table never had.
 */
import {
  ALL_TEMPLATE_TYPES,
  contentKindForTemplateType,
} from '@/features/brandkit/content/kinds';
import type { BrandKitTemplate } from '@/features/brandkit/types';
import { isArchived } from './curation';

/** `<type>-ext-N` → the zero-based index the dispatcher uses, or null. */
function extIndex(templateId: string): number | null {
  const match = /-ext-(\d+)$/.exec(templateId);
  if (!match) return null;
  const n = Number.parseInt(match[1], 10);
  return Number.isFinite(n) ? n - 1 : null;
}

export function rendererBindsContent(
  template: Pick<BrandKitTemplate, 'id' | 'type'> | null | undefined,
): boolean {
  if (!template) return false;
  // No content kind ⇒ the dispatcher passes this renderer no content, so
  // there is nothing an edit could reach. Brand assets and the guides.
  if (!contentKindForTemplateType(template.type as string)) return false;
  // The legacy designs (`invoices-3`, no `-ext-`) go through
  // `renderLegacyTemplate`, which takes no content.
  if (extIndex(template.id) === null) return false;
  // Curation is where a family records the designs it did NOT convert.
  if (isArchived(template.id)) return false;
  return true;
}

/**
 * The families this gate can answer `true` for — every template type the
 * content model knows a kind for.
 *
 * Derived, not listed: a family joins by gaining a kind in
 * `content/kinds.ts`, and the test cross-checks that every deliverable
 * with a `contentTypeId` in `kit/registry.ts` is in here.
 */
export const CONTENT_BOUND_TEMPLATE_TYPES: ReadonlyArray<string> =
  ALL_TEMPLATE_TYPES.filter((t) => contentKindForTemplateType(t) !== null);

/** What the UI says when an action is unavailable. Short, and true. */
export const NO_CONTENT_BINDING_REASON = "This design can't be edited in Design yet.";
