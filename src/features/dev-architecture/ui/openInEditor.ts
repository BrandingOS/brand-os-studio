/**
 * Open-in-editor, using the Vite dev server's built-in `/__open-in-editor`
 * middleware (the same one the HMR error overlay uses to jump to a stack frame).
 *
 * That means zero configuration and it respects the developer's own
 * `$EDITOR`/launch-editor settings. If it isn't available we report failure so
 * the caller can fall back to copying the path rather than silently doing
 * nothing.
 */

export interface OpenTarget {
  /** Repo-relative file path. */
  file: string;
  /** 1-indexed line. */
  line?: number;
}

export function editorUrl({ file, line }: OpenTarget): string {
  const location = line ? `${file}:${line}:1` : file;
  return `/__open-in-editor?file=${encodeURIComponent(location)}`;
}

/** Resolves true when the editor was launched. */
export async function openInEditor(target: OpenTarget): Promise<boolean> {
  try {
    const response = await fetch(editorUrl(target));
    return response.ok;
  } catch {
    return false;
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
