/**
 * The brand's folder tree — pure functions over `BrandFolder[]`.
 *
 * ONE tree per brand, shared by every content type. A folder is not "an
 * assets folder" or "a designs folder": it is a place in the brand, and
 * Library / Designs / Kit are views over the same structure. That is why
 * `brand_folders` carries no type column and nothing here takes one — the
 * moment a folder belongs to a tab you have three file managers instead of
 * one filesystem, and "Social" exists three times.
 *
 * Membership is nullable everywhere by design: an item with no folder is
 * unfiled and shows at the root. New content types join by carrying a
 * nullable folder id, not by extending anything here.
 */
import type { BrandFolder } from '@/shared/types/brand';

export interface FolderNode {
  folder: BrandFolder;
  children: FolderNode[];
}

/** Case-insensitive, digit-aware, so "Q2" sorts after "Q10" never happens. */
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function byName(a: BrandFolder, b: BrandFolder): number {
  return collator.compare(a.name, b.name);
}

const parentOf = (f: BrandFolder): string | null => f.parentId ?? null;

/** Direct children of `parentId` (null = the root), sorted by name. */
export function childrenOf(folders: BrandFolder[], parentId: string | null): BrandFolder[] {
  return folders.filter((f) => parentOf(f) === parentId).sort(byName);
}

/**
 * The whole tree as nested nodes.
 *
 * A folder whose parent is missing is treated as a root rather than dropped.
 * Locally, `deleteFolder` can leave a dangling parent behind, and a folder
 * the user can no longer reach is indistinguishable from one that was lost.
 */
export function buildFolderTree(folders: BrandFolder[]): FolderNode[] {
  const byParent = new Map<string | null, BrandFolder[]>();
  const ids = new Set(folders.map((f) => f.id));

  for (const folder of folders) {
    const parent = parentOf(folder);
    const key = parent !== null && ids.has(parent) ? parent : null;
    const bucket = byParent.get(key);
    if (bucket) bucket.push(folder);
    else byParent.set(key, [folder]);
  }

  const build = (parentId: string | null, seen: Set<string>): FolderNode[] =>
    (byParent.get(parentId) ?? [])
      .slice()
      .sort(byName)
      .filter((f) => !seen.has(f.id))
      .map((folder) => {
        const next = new Set(seen).add(folder.id);
        return { folder, children: build(folder.id, next) };
      });

  return build(null, new Set());
}

/**
 * Root → folder, for the breadcrumb. Empty when the id is unknown (an
 * unreadable `?folder=` in the URL must land the user at the root, not throw).
 * The `seen` guard means a cycle produces a truncated path rather than a hang.
 */
export function folderPath(folders: BrandFolder[], folderId: string | null): BrandFolder[] {
  if (!folderId) return [];
  const byId = new Map(folders.map((f) => [f.id, f]));
  const path: BrandFolder[] = [];
  const seen = new Set<string>();
  let current = byId.get(folderId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    const parent = parentOf(current);
    current = parent ? byId.get(parent) : undefined;
  }
  return path;
}

/** A folder and everything beneath it — the set a move must never target. */
export function descendantIds(folders: BrandFolder[], folderId: string): Set<string> {
  const out = new Set<string>([folderId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of folders) {
      const parent = parentOf(f);
      if (parent && out.has(parent) && !out.has(f.id)) {
        out.add(f.id);
        grew = true;
      }
    }
  }
  return out;
}

export function isNameTaken(
  folders: BrandFolder[],
  parentId: string | null,
  name: string,
  exceptId?: string,
): boolean {
  const wanted = name.trim().toLowerCase();
  return folders.some(
    (f) =>
      f.id !== exceptId &&
      parentOf(f) === parentId &&
      f.name.trim().toLowerCase() === wanted,
  );
}

export const MAX_FOLDER_NAME = 60;

/**
 * Returns the problem, or null when the name is fine. The uniqueness rule is
 * enforced by the database too (a partial unique index covers root folders,
 * which plain UNIQUE misses because Postgres treats NULLs as distinct) — this
 * is here so the user is told before the write, not by a 23505.
 */
export function validateFolderName(
  name: string,
  folders: BrandFolder[],
  parentId: string | null,
  exceptId?: string,
): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Give the folder a name.';
  if (trimmed.length > MAX_FOLDER_NAME) return `Keep it under ${MAX_FOLDER_NAME} characters.`;
  if (isNameTaken(folders, parentId, trimmed, exceptId)) {
    return 'A folder here already has that name.';
  }
  return null;
}

/**
 * How many items sit in each folder, counting descendants.
 *
 * A folder showing "0" while holding three subfolders full of work is a lie
 * the user has to click through to discover, so a parent counts everything
 * beneath it. Items are anything carrying a nullable folder id — assets,
 * designs, kit deliverables alike.
 */
export function countByFolder(
  folders: BrandFolder[],
  items: Array<{ folderId?: string | null }>,
): Map<string, number> {
  const direct = new Map<string, number>();
  for (const item of items) {
    const id = item.folderId ?? null;
    if (id) direct.set(id, (direct.get(id) ?? 0) + 1);
  }

  const totals = new Map<string, number>();
  for (const folder of folders) {
    let sum = 0;
    for (const id of descendantIds(folders, folder.id)) sum += direct.get(id) ?? 0;
    totals.set(folder.id, sum);
  }
  return totals;
}
