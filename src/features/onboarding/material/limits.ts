/**
 * What intake accepts.
 *
 * Stated on screen before the user drops anything, and enforced per item so a
 * folder that is slightly over budget loses only its overflow. Refusing a whole
 * drop because one file inside it was large is the behaviour that makes people
 * give up on an upload surface.
 *
 * Applied AFTER folder and archive expansion, so "10 files" means ten actual
 * files — not ten things dragged, one of which was a directory of forty.
 *
 * Pure — no service, no store, no React.
 */

/** Total files a brand may bring during onboarding. */
export const MAX_FILES = 10;

/** Per-file ceiling. */
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

/**
 * What actually counts against the limit.
 *
 * The limit is a promise about how many FILES the user may bring, so only
 * things the user brought as files may count. Everything below was counting and
 * should not have been:
 *
 *   generated variants   the black/white marks WE derive from an uploaded logo.
 *                        Three logos silently became six or nine.
 *   links                a URL is not a file and costs no storage.
 *   colours              a swatch is a value, not an upload.
 *   suggested fonts      a Google family we proposed was never uploaded.
 *
 * Font FILES group by family: five weights of one typeface are one typeface,
 * and charging the user five slots for it is the same mistake the font grouping
 * exists to prevent everywhere else.
 */
export interface CountableAsset {
  kind: string;
  generated?: boolean;
  fontSource?: string;
  name: string;
}

export function countUploads(items: readonly CountableAsset[]): number {
  const families = new Set<string>();
  let n = 0;
  for (const a of items) {
    if (a.generated) continue;
    if (a.kind === 'color' || a.kind === 'link') continue;
    if (a.kind === 'font') {
      // Only fonts the user actually uploaded, and one per family.
      if (a.fontSource !== 'upload') continue;
      const family = a.name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_](regular|medium|bold|light|thin|black|italic|semibold|extrabold)$/i, '');
      if (families.has(family.toLowerCase())) continue;
      families.add(family.toLowerCase());
    }
    n++;
  }
  return n;
}

/** The line shown under the dropzone. */
export function describeLimits(): string {
  return `Up to ${MAX_FILES} files · ${Math.round(MAX_FILE_BYTES / (1024 * 1024))} MB each`;
}

function mb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Why this file cannot be accepted, or `null` when it can.
 *
 * The message names the file and the actual reason, because "upload failed" is
 * the one thing a person can do nothing with.
 */
export function refuse(file: File, currentCount: number): string | null {
  if (currentCount >= MAX_FILES) {
    return `"${file.name}" — that's more than ${MAX_FILES} files. Remove one to make room.`;
  }
  if (file.size > MAX_FILE_BYTES) {
    return `"${file.name}" is ${mb(file.size)} — the limit is ${mb(MAX_FILE_BYTES)}.`;
  }
  return null;
}

/**
 * Splits a batch into what fits and what does not.
 *
 * Used by the folder path, where the count moves as the batch is consumed —
 * a caller that checked the limit once up front would accept the eleventh file.
 */
export function partition(
  files: readonly File[],
  currentCount: number,
): { accepted: File[]; refused: string[] } {
  const accepted: File[] = [];
  const refused: string[] = [];
  let count = currentCount;
  for (const f of files) {
    const no = refuse(f, count);
    if (no) {
      refused.push(no);
      continue;
    }
    accepted.push(f);
    count++;
  }
  return { accepted, refused };
}
