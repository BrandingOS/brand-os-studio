/**
 * Which Design object is the canonical master for a deliverable variant.
 *
 * Masters are seeded LAZILY — on the first Edit Template, never for all
 * deliverables up front. A brand that never tunes its invoice never
 * accumulates a master for it.
 *
 * The master is identified by (contentType, sourceTemplateId, isTemplate)
 * rather than a separate index, so there is one storage model and nothing
 * to keep in sync.
 */
import type { DeliverableContent } from '@/features/brandkit/content';
import {
  createTemplateInstanceDocument,
  instantiateFromMaster,
} from '@/features/editor/renderers/template-instance/createDocument';
import { BrandOSDocumentSchema, type BrandOSDocument } from '@/features/editor/schema';
import type { DesignSummary, IDesignStorage } from '@/core/types/services';

export type MasterLookup = {
  storage: IDesignStorage;
  brandId: string;
  contentType: string;
  templateId: string;
};

/**
 * The master for a variant, or null.
 *
 * READ-ONLY on purpose. `Use Template` instantiates from a master when
 * one exists and falls back to brand defaults when one does not — it must
 * never seed one as a side effect, or every first use would silently mint
 * a master the user never asked to tune.
 *
 * Both callers share this ONE predicate rather than each writing their
 * own. Two copies of "which row is the master" is exactly how `Use
 * Template` and `Edit Template` came to disagree about whether a master
 * existed at all.
 */
export async function findMasterDesign(args: MasterLookup): Promise<DesignSummary | null> {
  const existing = await args.storage.listDesigns(args.brandId);
  return (
    existing.find(
      (d) =>
        d.isTemplate === true &&
        d.contentType === args.contentType &&
        d.sourceTemplateId === args.templateId,
    ) ?? null
  );
}

/**
 * A working copy of the master for a variant — or null when there is no
 * master, or the one on record cannot be read.
 *
 * Null is a legitimate answer, not a failure: the caller falls back to
 * the brand's defaults. A master that fails to load must not block the
 * user from starting a design, so a bad row degrades to "no master"
 * rather than to an error.
 *
 * The stored body is validated before it is copied. It crossed a storage
 * boundary, and a document that would not open in the editor should not
 * become the thing every new invoice starts from.
 */
export async function instanceFromMaster(
  args: MasterLookup & { designId: string },
): Promise<BrandOSDocument | null> {
  try {
    const master = await findMasterDesign(args);
    if (!master) return null;
    const raw = await args.storage.loadDesign(args.brandId, master.id);
    if (!raw) return null;
    const parsed = BrandOSDocumentSchema.safeParse(raw);
    if (!parsed.success) return null;
    if (parsed.data.body?.kind !== 'template-instance') return null;
    return instantiateFromMaster(parsed.data, args.designId);
  } catch {
    return null;
  }
}

export async function ensureMasterDesign(args: {
  storage: IDesignStorage;
  brandId: string;
  contentType: string;
  templateId: string;
  label: string;
  seedContent: DeliverableContent;
}): Promise<string> {
  const master = await findMasterDesign(args);
  if (master) return master.id;

  const designId = crypto.randomUUID();
  const doc = createTemplateInstanceDocument({
    designId,
    brandId: args.brandId,
    contentType: args.contentType,
    templateId: args.templateId,
    content: args.seedContent,
    design: {},
    // The doc says which catalog variant it paints, exactly as the
    // storage summary below does — so a copy taken from this master
    // inherits the same answer instead of inventing one.
    sourceTemplateId: args.templateId,
  });
  // Stamp `isTemplate` on the DOCUMENT itself too, not just the storage
  // summary — the editor route loads the doc body via `loadDesign` (no
  // summary attached), and it's the only signal it has for "am I looking
  // at a master?" (drives EditorDuplicateDesignButton's Use-template
  // behavior). The summary meta below remains the source of truth for
  // listing/lookup; this mirrors it onto the doc for readers who only
  // have the body.
  doc.metadata = { ...doc.metadata, isTemplate: true };
  await args.storage.saveDesign(args.brandId, designId, doc, {
    name: args.label,
    contentType: args.contentType,
    isTemplate: true,
    sourceTemplateId: args.templateId,
  });
  return designId;
}
