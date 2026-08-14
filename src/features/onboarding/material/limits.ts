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
