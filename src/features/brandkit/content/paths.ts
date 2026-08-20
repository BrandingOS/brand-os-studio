/**
 * Reading and writing content by path.
 *
 * A path is what a `<Bind>` declares and what a panel field addresses —
 * `fullName`, `lineItems.2.unitPrice`. One vocabulary for both, so a
 * region on the artifact and a control in the panel are provably talking
 * about the same value rather than two things that happen to look alike.
 *
 * Writes are immutable and copy only the spine down to the change, so
 * React sees a new object exactly where something changed and nowhere
 * else.
 */

export type ContentPath = string;

function segments(path: ContentPath): string[] {
  return path.split('.').filter((s) => s.length > 0);
}

function isIndex(segment: string): boolean {
  return /^\d+$/.test(segment);
}

export function getAtPath(root: unknown, path: ContentPath): unknown {
  let cursor: unknown = root;
  for (const key of segments(path)) {
    if (cursor === null || cursor === undefined) return undefined;
    if (Array.isArray(cursor)) {
      if (!isIndex(key)) return undefined;
      cursor = cursor[Number(key)];
    } else if (typeof cursor === 'object') {
      cursor = (cursor as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return cursor;
}

/** Value at `path` as a display string. Numbers stringify; absent is ''. */
export function getStringAtPath(root: unknown, path: ContentPath): string {
  const value = getAtPath(root, path);
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  return String(value);
}

/**
 * Return a copy of `root` with `path` set to `value`.
 *
 * Returns `root` unchanged when the path cannot be walked — a bound
 * region referring to a field that no longer exists must not be able to
 * corrupt the content by inventing structure on write.
 */
export function setAtPath<T>(root: T, path: ContentPath, value: unknown): T {
  const keys = segments(path);
  if (keys.length === 0) return root;
  return write(root, keys, value) as T;
}

function write(node: unknown, keys: string[], value: unknown): unknown {
  const [key, ...rest] = keys;

  if (Array.isArray(node)) {
    if (!isIndex(key)) return node;
    const index = Number(key);
    if (index < 0 || index >= node.length) return node;
    const child = rest.length === 0 ? value : write(node[index], rest, value);
    // A deeper write that changed nothing must not manufacture a new
    // array here, or "no such path" would still hand React a fresh object
    // and re-render the artifact for an edit that never happened.
    if (child === node[index]) return node;
    const next = node.slice();
    next[index] = child;
    return next;
  }

  if (node !== null && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    // Never create a key that was not already there; see the doc comment.
    if (!(key in obj)) return node;
    const child = rest.length === 0 ? value : write(obj[key], rest, value);
    if (child === obj[key]) return node;
    return { ...obj, [key]: child };
  }

  return node;
}

/**
 * Coerce a string typed by a human into the shape the field already holds.
 *
 * Inline editing hands back text, always — a contentEditable region has
 * no idea it is a price. The existing value is the only reliable evidence
 * of what the field is, so the type is taken from there rather than from
 * a parallel declaration that could drift.
 */
export function coerceToPathType(root: unknown, path: ContentPath, text: string): unknown {
  const current = getAtPath(root, path);
  if (typeof current === 'number') {
    // Tolerate what people actually type into a money or quantity field.
    const cleaned = text.replace(/[^0-9.\-]/g, '').trim();
    // `Number('')` is 0, so an unparseable entry would silently zero the
    // field rather than being rejected. Keep the old number instead.
    if (cleaned === '' || cleaned === '-' || cleaned === '.') return current;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : current;
  }
  return text;
}

/** The `lineItems.3.label` → `3` an item-scoped control needs. */
export function indexInPath(path: ContentPath): number | null {
  for (const key of segments(path)) {
    if (isIndex(key)) return Number(key);
  }
  return null;
}
