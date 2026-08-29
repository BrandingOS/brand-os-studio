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
 * This is a TABLE, and it has to be. A React component's props are not
 * introspectable at runtime, and whether a given design was retrofitted
 * onto the content model is a fact about its own source, not about which
 * wave it shipped in — the Brand Kit's `-ext-` numbering does NOT separate
 * the two. (Written as a wave boundary first; `contentBinding.test.tsx`
 * rendered every variant and disproved it in one run.)
 *
 * What makes the table trustworthy is that same test: it RENDERS every
 * variant of every wired family and asserts a `[data-bind]` region appears
 * exactly where this function says it should. It also fails when a family
 * gains a `contentTypeId` without gaining an entry here.
 */
import type { BrandKitTemplate } from '@/features/brandkit/types';

/**
 * templateType → which of its extended designs bind content.
 *
 * The argument is the zero-based extension index (`<type>-ext-N` → `N-1`),
 * matching what `renderCosmosTemplate`'s dispatcher computes.
 *
 * Keyed only by the families Brand Kit actually hands to Design — the ones
 * with a `contentTypeId` in `kit/registry.ts`. Everything else answers
 * `false`, which is the truth for it: an unwired family has no route into
 * Design at all.
 */
const BINDS_CONTENT_BY_TYPE: Record<string, (extIndex: number) => boolean> = {
  // `InvoicesExtendedRenderer` takes a `content` prop, but only its first
  // eight designs were retrofitted onto it. Designs 9-22 (and every Wave 2
  // design, which routes to `InvoicesExtended2Renderer` — no content prop
  // at all) still paint their own figures.
  // Every KEPT invoice binds; the unbound ones are archived in curation.
  invoices: () => true,
};

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
  const binds = BINDS_CONTENT_BY_TYPE[template.type as string];
  if (!binds) return false;
  // The legacy designs (`invoices-3`, no `-ext-`) go through
  // `renderLegacyTemplate`, which takes no content.
  const idx = extIndex(template.id);
  if (idx === null) return false;
  return binds(idx);
}

/** The families this gate knows about — the test cross-checks the registry. */
export const CONTENT_BOUND_TEMPLATE_TYPES = Object.keys(BINDS_CONTENT_BY_TYPE);

/** What the UI says when an action is unavailable. Short, and true. */
export const NO_CONTENT_BINDING_REASON = "This design can't be edited in Design yet.";
