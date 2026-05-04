import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { GOOGLE_FONTS } from '@/shared/design-system/googleFonts';

const FONT_EXTENSIONS = ['.woff', '.woff2', '.ttf', '.otf', '.eot'];
const FONT_MIME_PREFIXES = ['font/', 'application/font-', 'application/x-font-', 'application/vnd.ms-fontobject'];

/** Curated list of popular Google Fonts shown as the default picker state
 *  when the search input is empty. Mixed display + text + mono so the
 *  user sees range at a glance instead of every font starting with A.
 *  When the user types, we search the full catalogue in GOOGLE_FONTS. */
const GOOGLE_FONT_PICKS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Raleway',
  'Nunito',
  'Work Sans',
  'Ubuntu',
  'DM Sans',
  'Karla',
  'Rubik',
  'Manrope',
  'Plus Jakarta Sans',
  'Outfit',
  'Urbanist',
  'Figtree',
  'Playfair Display',
  'Merriweather',
  'Lora',
  'Crimson Pro',
  'Libre Baskerville',
  'DM Serif Display',
  'Instrument Serif',
  'EB Garamond',
  'Cormorant Garamond',
  'Fraunces',
  'IBM Plex Sans',
  'IBM Plex Serif',
  'IBM Plex Mono',
  'Roboto Mono',
  'Space Mono',
  'JetBrains Mono',
  'Fira Code',
  'Space Grotesk',
  'Archivo',
  'Epilogue',
  'Bebas Neue',
  'Oswald',
];

/** Max families rendered at once — caps stylesheet payload and keeps the
 *  scrollable list snappy even when the user types two characters and
 *  hundreds of matches would otherwise qualify. */
const PICK_VISIBLE_MAX = 60;

/** Short specimen shown on each picker row, rendered in the font's own
 *  typeface so the user can compare families at a glance. */
const PICK_SAMPLE = 'The professional standard';

function googleFontsHref(families: string[]): string {
  const params = families
    .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;600`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

function isFontFile(file: File): boolean {
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  if (FONT_EXTENSIONS.some((ext) => name.endsWith(ext))) return true;
  // Some browsers report empty/inconsistent MIME for font files, so the
  // extension check above is the primary gate. MIME is a fallback.
  if (type && FONT_MIME_PREFIXES.some((p) => type.startsWith(p))) return true;
  return false;
}

/** Walk a dropped DataTransfer and return every File beneath it, recursing
 *  into folders via the webkitGetAsEntry API. Falls back to `files` on
 *  browsers that don't expose entries. */
async function collectFiles(dt: DataTransfer): Promise<File[]> {
  const items = dt.items;
  if (!items || items.length === 0 || typeof items[0]?.webkitGetAsEntry !== 'function') {
    return Array.from(dt.files);
  }
  const entries: FileSystemEntry[] = [];
  for (let i = 0; i < items.length; i++) {
    const entry = items[i].webkitGetAsEntry?.();
    if (entry) entries.push(entry);
  }
  const out: File[] = [];
  await Promise.all(entries.map((e) => walkEntry(e, out)));
  return out;
}

function walkEntry(entry: FileSystemEntry, collect: File[]): Promise<void> {
  return new Promise((resolve) => {
    if (entry.isFile) {
      (entry as FileSystemFileEntry).file(
        (f) => {
          collect.push(f);
          resolve();
        },
        () => resolve(),
      );
      return;
    }
    if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      const readAll = () => {
        reader.readEntries(
          async (batch) => {
            if (batch.length === 0) {
              resolve();
              return;
            }
            await Promise.all(batch.map((e) => walkEntry(e, collect)));
            readAll();
          },
          () => resolve(),
        );
      };
      readAll();
      return;
    }
    resolve();
  });
}

/** Tokens commonly appended to a font filename to denote weight/style.
 *  When a filename ends with any sequence of these, they're stripped to
 *  recover the base family name. */
const WEIGHT_TOKENS = new Set([
  'thin',
  'hairline',
  'extralight',
  'ultralight',
  'light',
  'regular',
  'normal',
  'book',
  'text',
  'medium',
  'semibold',
  'demibold',
  'bold',
  'extrabold',
  'ultrabold',
  'black',
  'heavy',
  'italic',
  'oblique',
  'condensed',
  'expanded',
  'compressed',
  'extended',
]);

/** Canonical ordering for weights inside a family, ligthest → heaviest,
 *  with italics pushed after their upright twins. */
const WEIGHT_RANK: Record<string, number> = {
  thin: 100,
  hairline: 100,
  extralight: 200,
  ultralight: 200,
  light: 300,
  regular: 400,
  normal: 400,
  book: 400,
  text: 400,
  medium: 500,
  semibold: 600,
  demibold: 600,
  bold: 700,
  extrabold: 800,
  ultrabold: 800,
  black: 900,
  heavy: 900,
};

/** Split a filename (sans extension) into tokens. Handles hyphens,
 *  underscores, spaces, and camelCase / acronym boundaries. */
function tokenize(stem: string): string[] {
  const primary = stem.split(/[-_ ]+/).filter(Boolean);
  const out: string[] = [];
  for (const part of primary) {
    const matches = part.match(/[A-Z]+(?=[A-Z][a-z])|[A-Z]?[a-z]+|[A-Z]+|\d+/g);
    if (matches && matches.length > 0) out.push(...matches);
    else out.push(part);
  }
  return out;
}

/** Given a font filename, split it into the family name and the
 *  human-readable weight label. Trailing weight/style tokens are stripped
 *  from the family; what was stripped (plus any numeric weight) becomes
 *  the weight label. */
function parseFontFilename(filename: string): { family: string; weight: string } {
  const stem = filename.replace(/\.[^.]+$/, '');
  const tokens = tokenize(stem);
  let end = tokens.length;
  while (end > 0) {
    const t = tokens[end - 1].toLowerCase();
    if (WEIGHT_TOKENS.has(t) || /^\d+$/.test(t)) {
      end--;
    } else {
      break;
    }
  }
  if (end === 0) return { family: stem || 'Untitled', weight: 'Regular' };
  const family = tokens.slice(0, end).join(' ');
  const weightTokens = tokens.slice(end);
  const weight = weightTokens.length > 0 ? formatWeightLabel(weightTokens) : 'Regular';
  return { family, weight };
}

function formatWeightLabel(tokens: string[]): string {
  const filtered = tokens.filter((t) => !/^\d+$/.test(t));
  const parts = filtered.length > 0 ? filtered : tokens;
  return parts
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase())
    .join(' ');
}

function weightSortKey(label: string): number {
  const lower = label.toLowerCase();
  const isItalic = lower.includes('italic') || lower.includes('oblique');
  const base = lower
    .replace(/italic|oblique/g, '')
    .trim()
    .split(/\s+/)
    .find((t) => WEIGHT_RANK[t] !== undefined);
  const rank = base ? WEIGHT_RANK[base] : 400;
  return rank + (isItalic ? 0.5 : 0);
}

/** Group a list of font files by detected family name and dedupe the
 *  weights within each family, sorted light→heavy with italics after. */
export function groupFontsByFamily(
  files: File[],
): Array<{ family: string; weights: string[] }> {
  const map = new Map<string, Set<string>>();
  for (const f of files) {
    const { family, weight } = parseFontFilename(f.name);
    if (!map.has(family)) map.set(family, new Set());
    map.get(family)!.add(weight);
  }
  return Array.from(map.entries()).map(([family, set]) => ({
    family,
    weights: Array.from(set).sort((a, b) => weightSortKey(a) - weightSortKey(b)),
  }));
}

export type UploadedFontFile = {
  name: string;
  weight: string;
  format: 'ttf' | 'otf' | 'woff' | 'woff2' | 'eot';
  dataUrl: string;
  size: number;
};

export type UploadedFontFamily = {
  family: string;
  weights: string[];
  /** Per-file payload — empty when the user picked from Google Fonts
   *  (no upload) and only the family/weights are known. */
  files: UploadedFontFile[];
};

/** Read a File as a base64 data URL. */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || '');
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

function detectFontFormat(file: File): UploadedFontFile['format'] {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'ttf' || ext === 'otf' || ext === 'woff' || ext === 'woff2' || ext === 'eot') {
    return ext;
  }
  return 'ttf';
}

/** Read every uploaded font, group by family, and attach each file's
 *  payload (bytes + weight + format) so the parent can persist the
 *  uploads alongside the family metadata. */
export async function readFontUploads(files: File[]): Promise<UploadedFontFamily[]> {
  const grouped = groupFontsByFamily(files);
  const filesByFamily = new Map<string, UploadedFontFile[]>();
  for (const file of files) {
    const { family, weight } = parseFontFilename(file.name);
    let dataUrl: string;
    try {
      dataUrl = await readFileAsDataUrl(file);
    } catch {
      continue;
    }
    const existing = filesByFamily.get(family) ?? [];
    existing.push({
      name: file.name || `${family}.ttf`,
      weight,
      format: detectFontFormat(file),
      dataUrl,
      size: file.size,
    });
    filesByFamily.set(family, existing);
  }
  return grouped.map((g) => ({
    family: g.family,
    weights: g.weights,
    files: filesByFamily.get(g.family) ?? [],
  }));
}

export type UploadKind = 'logo' | 'icons' | 'photos' | 'fonts' | 'website';

export type CommittedAsset = {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  svg: string | null;
};

type Props = {
  open: boolean;
  kind: UploadKind | null;
  onClose: () => void;
  onCommit?: (asset: CommittedAsset, kind: UploadKind) => void;
  onUrl?: (url: string, kind: UploadKind) => void;
  /** Called once per detected font family when a folder or multi-font
   *  drop resolves. The modal reads each file as a data URL so the
   *  parent receives both the family metadata AND the uploaded
   *  bytes — needed to re-emit the user's exact file on export. */
  onFontFamilies?: (families: UploadedFontFamily[]) => void;
};

type SessionEntry = {
  id: string;
  name: string;
  sub: string;
  preview: string | null;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function acceptForKind(kind: UploadKind): string {
  if (kind === 'photos') return 'image/*';
  if (kind === 'icons') return '.svg,image/svg+xml';
  if (kind === 'fonts') return '.woff,.woff2,.ttf,.otf,.eot';
  return 'image/*,.svg,.pdf';
}

/** URL-only kinds show a smaller, URL-centric modal and hide file-drop entry points. */
function isUrlOnly(kind: UploadKind | null): boolean {
  return kind === 'website';
}

/** File-only kinds hide the URL pill entirely — users upload by dropping
 *  a file or clicking inside the drop area, and the modal is confirmed
 *  with the footer Done button once they've finished adding. */
function isFileOnly(kind: UploadKind | null): boolean {
  return kind === 'logo' || kind === 'photos';
}

function urlPromptForKind(kind: UploadKind | null): { heading: string; placeholder: string } {
  if (kind === 'website') {
    return {
      heading: 'Paste a website URL',
      placeholder: 'https://example.com',
    };
  }
  if (kind === 'fonts') {
    return {
      heading: 'Add a font — search Google Fonts',
      placeholder: 'Search fonts — e.g. Inter, Playfair',
    };
  }
  return { heading: '', placeholder: 'Paste a URL' };
}

export function UploadModal({
  open,
  kind,
  onClose,
  onCommit,
  onUrl,
  onFontFamilies,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const urlInputRef = useRef<HTMLInputElement | null>(null);
  const dropZoneRef = useRef<HTMLDivElement | null>(null);
  const [session, setSession] = useState<SessionEntry[]>([]);
  const [isDrag, setIsDrag] = useState(false);
  // Font search query — controlled so the picker list below filters live
  // as the user types. Used only when kind === 'fonts'; other kinds still
  // treat the pill as a URL input.
  const [fontQuery, setFontQuery] = useState('');

  const visibleFonts = useMemo(() => {
    if (kind !== 'fonts') return [];
    const q = fontQuery.trim().toLowerCase();
    if (!q) return GOOGLE_FONT_PICKS;
    const matches: string[] = [];
    for (const name of GOOGLE_FONTS) {
      if (name.toLowerCase().includes(q)) {
        matches.push(name);
        if (matches.length >= PICK_VISIBLE_MAX) break;
      }
    }
    return matches;
  }, [fontQuery, kind]);

  const resetSession = useCallback(() => setSession([]), []);

  useEffect(() => {
    if (!open) {
      resetSession();
      setIsDrag(false);
      setFontQuery('');
    }
  }, [open, resetSession]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Enter' && isFileOnly(kind)) {
        // File-only modes (logo, photos) have no URL input, so Enter
        // unambiguously means "I'm done adding files" — close the modal.
        const t = e.target as HTMLElement | null;
        const tag = t?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || t?.isContentEditable) return;
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, kind]);

  // Auto-focus the URL input when the modal opens so the user can start
  // typing immediately — no need to click into the pill first. Pushed to
  // the next frame so the dialog's open transition doesn't eat focus.
  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => {
      urlInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  // Inject a Google Fonts stylesheet for the currently-visible subset so
  // each picker row can render its own name/sample in its actual
  // typeface. Debounced by 140ms so fast typing doesn't thrash the
  // network — one request per pause in search input.
  useEffect(() => {
    if (!open || kind !== 'fonts' || visibleFonts.length === 0) return;
    const timer = window.setTimeout(() => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = googleFontsHref(visibleFonts);
      link.setAttribute('data-font-picker', 'true');
      document.head.appendChild(link);
      (link as unknown as { _cleanup?: () => void })._cleanup = () => link.remove();
    }, 140);
    return () => {
      window.clearTimeout(timer);
      document
        .querySelectorAll('link[data-font-picker="true"]')
        .forEach((el) => el.remove());
    };
  }, [open, kind, visibleFonts]);

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      if (!kind) return;
      const incoming = Array.from(files);
      if (incoming.length === 0) return;

      // Fonts kind: filter to real font files, read each as a data
      // URL so we can persist the uploaded bytes, then hand the
      // family-grouped payload to the parent. Rejected files toast.
      if (kind === 'fonts') {
        const fonts = incoming.filter((f) => isFontFile(f));
        const rejected = incoming.filter((f) => !isFontFile(f));
        if (rejected.length > 0) {
          const names = rejected.map((f) => f.name).slice(0, 3).join(', ');
          toast.error(
            rejected.length === 1
              ? `${names} isn't a font file`
              : `${rejected.length} files rejected — fonts only`,
            { description: 'Accepted: .woff · .woff2 · .ttf · .otf · .eot' },
          );
        }
        if (fonts.length === 0) return;
        readFontUploads(fonts).then((families) => {
          setSession((prev) => [
            ...prev,
            ...families.map((fam) => ({
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              name: fam.family,
              sub: `${fam.weights.length} weight${fam.weights.length === 1 ? '' : 's'}`,
              preview: null as string | null,
            })),
          ]);
          onFontFamilies?.(families);
        });
        return;
      }

      incoming.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = (e.target?.result as string) || '';
          const isSvg = !!file.type && file.type.includes('svg');
          let svgText: string | null = null;
          if (isSvg) {
            try {
              svgText = decodeURIComponent(escape(atob(dataUrl.split(',')[1] ?? '')));
            } catch {
              svgText = null;
            }
          }
          const isBitmap = !!file.type && file.type.startsWith('image/') && !isSvg;
          const ext = (file.type && file.type.split('/').pop()) || 'FILE';
          const entry: SessionEntry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: file.name || 'File',
            sub: `${ext.toUpperCase()} · ${formatSize(file.size)}`,
            preview: isBitmap ? dataUrl : null,
          };
          setSession((prev) => [...prev, entry]);
          onCommit?.(
            {
              name: file.name || 'File',
              size: file.size,
              type: file.type || '',
              dataUrl,
              svg: svgText,
            },
            kind,
          );
        };
        reader.readAsDataURL(file);
      });
    },
    [kind, onCommit, onFontFamilies],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDrag(false);
      if (!e.dataTransfer) return;
      // Folder drops don't populate `files` — recurse via webkitGetAsEntry
      // to pull every nested file. Stash the DataTransfer early because
      // React pools synthetic events.
      const dt = e.dataTransfer;
      const collected = await collectFiles(dt);
      if (collected.length > 0) handleFiles(collected);
    },
    [handleFiles],
  );

  const handleUrlKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !kind) return;
    // Fonts kind: the pill is a search field — Enter commits the first
    // matching family from the filtered list. If there are no matches we
    // bail silently (the empty list is already feedback enough).
    if (kind === 'fonts') {
      const top = visibleFonts[0];
      if (!top) return;
      onUrl?.(top, 'fonts');
      setFontQuery('');
      return;
    }
    const val = (e.currentTarget.value || '').trim();
    if (!val) return;
    onUrl?.(val, kind);
    const entry: SessionEntry = {
      id: `${Date.now()}`,
      name: val.replace(/^https?:\/\//, '').slice(0, 48),
      sub: 'URL',
      preview: null,
    };
    setSession((prev) => [...prev, entry]);
    e.currentTarget.value = '';
  };

  const removeOne = (id: string) =>
    setSession((prev) => prev.filter((e) => e.id !== id));

  const clearAll = () => setSession([]);

  const itemsLabel = session.length === 1 ? '1 item' : `${session.length} items`;
  const urlOnly = isUrlOnly(kind);
  const fileOnly = isFileOnly(kind);
  const { heading: customHeading, placeholder: urlPlaceholder } = urlPromptForKind(kind);

  return (
    <div
      className={`upload-modal-backdrop${open ? ' is-open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="upload-modal-shell">
        <div
          ref={dropZoneRef}
          className={`drop-zone${isDrag ? ' is-drag' : ''}${urlOnly ? ' is-url-only' : ''}`}
          role={urlOnly ? undefined : 'button'}
          tabIndex={urlOnly ? -1 : 0}
          aria-label="Upload — drag and drop, click to upload, or paste a URL"
          onClick={(e) => {
            if (urlOnly) return;
            if (
              (e.target as HTMLElement).closest(
                '.drop-pill, .drop-close, .items-clear, .upload-tile-remove, .upload-modal-foot, .pill-btn',
              )
            )
              return;
            fileInputRef.current?.click();
          }}
          onKeyDown={(e) => {
            if (urlOnly) return;
            // Don't steal keys from focused controls inside the drop-zone
            // (footer buttons, inputs). Only react to Space/Enter on the
            // drop-zone itself.
            if (e.target !== e.currentTarget) return;
            // In file-only modes, Enter is reserved for "Done" (handled at
            // the document level); only Space opens the file picker.
            if (e.key === ' ' || (e.key === 'Enter' && !fileOnly)) {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            if (urlOnly) return;
            e.preventDefault();
            setIsDrag(true);
          }}
          onDragLeave={() => setIsDrag(false)}
          onDrop={urlOnly ? undefined : handleDrop}
        >
          <button type="button" className="drop-close" aria-label="Close" onClick={onClose}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>

          <div className="drop-inset">
            <svg className="drop-border" aria-hidden>
              <rect />
            </svg>

            <div className="drop-content">
              {!urlOnly && (
                <div className="previews" aria-hidden>
                  <div className="preview-card preview-png">
                    <img src="/setup/preview-cards/png.png" alt="" />
                  </div>
                  <div className="preview-card preview-jpg">
                    <img src="/setup/preview-cards/jpg.png" alt="" />
                  </div>
                  <div className="preview-card preview-pdf">
                    <img src="/setup/preview-cards/pdf.png" alt="" />
                  </div>
                </div>
              )}

              {urlOnly ? (
                <p className="drop-text drop-text--url">{customHeading || 'Paste a URL'}</p>
              ) : kind === 'fonts' ? (
                <p className="drop-text">
                  {customHeading}
                  <br />
                  <button
                    type="button"
                    className="drop-inline"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    upload font file
                  </button>
                  {' · '}
                  <button
                    type="button"
                    className="drop-inline"
                    onClick={(e) => {
                      e.stopPropagation();
                      folderInputRef.current?.click();
                    }}
                  >
                    or a folder
                  </button>
                </p>
              ) : (
                <p className="drop-text">
                  Drag &amp; drop image here,{' '}
                  <button
                    type="button"
                    className="drop-inline"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    upload file
                  </button>
                  {fileOnly ? '' : ' or paste the URL'}
                </p>
              )}

              {!fileOnly && (
                <label className="drop-pill" onClick={(e) => e.stopPropagation()}>
                  {kind === 'fonts' ? (
                    <svg
                      className="drop-pill-icon"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <circle cx="11" cy="11" r="7" />
                      <path d="m20 20-3.5-3.5" />
                    </svg>
                  ) : (
                    <svg
                      className="drop-pill-icon"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
                      <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
                    </svg>
                  )}
                  {kind === 'fonts' ? (
                    <input
                      ref={urlInputRef}
                      type="text"
                      placeholder={urlPlaceholder}
                      autoComplete="off"
                      spellCheck={false}
                      value={fontQuery}
                      onChange={(e) => setFontQuery(e.target.value)}
                      onKeyDown={handleUrlKey}
                    />
                  ) : (
                    <input
                      ref={urlInputRef}
                      type="url"
                      placeholder={urlPlaceholder}
                      autoComplete="off"
                      spellCheck={false}
                      onKeyDown={handleUrlKey}
                    />
                  )}
                </label>
              )}

              {kind === 'fonts' && (
                <div className="font-picks" onClick={(e) => e.stopPropagation()}>
                  <div className="font-picks-head">
                    {fontQuery.trim() ? `Results · ${visibleFonts.length}` : 'Popular Google Fonts'}
                  </div>
                  <div className="font-picks-list" role="listbox" aria-label="Google Fonts">
                    {visibleFonts.length === 0 ? (
                      <div className="font-picks-empty">No fonts match "{fontQuery}"</div>
                    ) : (
                      visibleFonts.map((name) => {
                        const stack = `"${name}", sans-serif`;
                        return (
                          <button
                            key={name}
                            type="button"
                            role="option"
                            className="font-pick"
                            onClick={() => onUrl?.(name, 'fonts')}
                          >
                            <span
                              className="font-pick-sample"
                              style={{ fontFamily: stack }}
                            >
                              {PICK_SAMPLE}
                            </span>
                            <span className="font-pick-name">{name}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {session.length > 0 && (
                <div className="drop-items-wrap has-items" onClick={(e) => e.stopPropagation()}>
                  <div className="drop-items-bar">
                    <span className="drop-items-count">{itemsLabel}</span>
                    <button type="button" className="items-clear" onClick={clearAll}>
                      Clear all
                    </button>
                  </div>
                  <div className="drop-items">
                    {session.map((entry) => (
                      <div
                        key={entry.id}
                        className={`upload-tile${entry.preview ? ' is-image' : ''}`}
                      >
                        {entry.preview && (
                          <div
                            className="upload-tile-preview"
                            style={{ backgroundImage: `url(${entry.preview})` }}
                          />
                        )}
                        <div className="upload-tile-meta">
                          <div className="upload-tile-name">{entry.name}</div>
                          <div className="upload-tile-sub">{entry.sub}</div>
                        </div>
                        <button
                          type="button"
                          className="upload-tile-remove"
                          aria-label={`Remove ${entry.name}`}
                          onClick={() => removeOne(entry.id)}
                        >
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                          >
                            <path d="M18 6 6 18" />
                            <path d="m6 6 12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            accept={kind ? acceptForKind(kind) : undefined}
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = '';
            }}
          />
          {/* Folder picker — only wired up for fonts. Uses the nonstandard
              webkitdirectory attribute, which Chrome, Edge, Safari, and
              Firefox all support. `handleFiles` already does the filter +
              family grouping, so the folder's contents flow through the
              same path as a drag-dropped folder. */}
          <input
            ref={folderInputRef}
            type="file"
            hidden
            {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
              e.target.value = '';
            }}
          />

          <footer
            className="upload-modal-foot"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="pill-btn pill-btn--ghost"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="pill-btn pill-btn--primary"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
            >
              Done
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}

