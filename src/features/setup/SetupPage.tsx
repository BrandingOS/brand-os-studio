import { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { WorkspaceShell } from '@/shared/layouts/WorkspaceShell';
import { useBrandStore } from '@/shared/store/brandStore';
import { EmbeddedTypescaleDialog } from '@/features/tools/typescale';
import { mockBrand, type MockBrand } from './data/mockBrand';
import { SetupSidebar, type SectionKey } from './components/SetupSidebar';
import { LOGO_ROLES, SetupBoard, type SetupBoardRefs } from './components/SetupBoard';
import { ArrowRight, ICON_MAP } from './components/SetupIcons';
import { UploadModal, type UploadKind, type CommittedAsset } from './components/UploadModal';
import { AboutEditorModal, type AboutEditorInitial } from './components/AboutEditorModal';
import { PreviewModal, type PreviewData } from './components/PreviewModal';
import { hexToName } from './data/colorNames';
import { loadFontFamily, registerUploadedFontFamily } from '@/shared/design-system/fonts';
import {
  buildZip,
  downloadBlob,
  fetchGoogleFontPackage,
  renderIconToSvg,
  serializeSvgNode,
  slugify,
  svgToRasterBlob,
} from './utils/downloads';

const UPLOAD_KINDS: ReadonlySet<SectionKey> = new Set<SectionKey>([
  'logo',
  'icons',
  'photos',
  'fonts',
  'website',
]);

const MAX_WEBSITES = 3;
const MAX_FONTS = 4;

/** Drop duplicate uploaded font files within a family — same name +
 *  same byte length is the dedupe key, since the user might re-drop
 *  a folder. Keeps order stable so the first weight in is first out. */
function dedupeFontFiles<T extends { name: string; size: number }>(files: T[]): T[] {
  const seen = new Set<string>();
  return files.filter((f) => {
    const key = `${f.name.toLowerCase()}::${f.size}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

type ColorGroupKey = 'core' | 'accent' | 'grey';

function deriveFontFamilyFromInput(raw: string): string {
  const val = raw.trim();
  if (!val) return '';
  // Google Fonts URL: .../specimen/Inter  or  .../css2?family=Inter
  const specimen = val.match(/\/specimen\/([^/?#]+)/i);
  if (specimen) return decodeURIComponent(specimen[1]).replace(/\+/g, ' ');
  try {
    const u = new URL(val);
    const fam = u.searchParams.get('family');
    if (fam) return fam.split(':')[0].replace(/\+/g, ' ');
  } catch {
    /* not a URL */
  }
  return val;
}

function normalizeWebsiteUrl(raw: string): string {
  const val = raw.trim();
  if (!val) return '';
  if (/^https?:\/\//i.test(val)) return val;
  return `https://${val}`;
}

/** True when the URL path looks like an image asset (by extension) or is
 *  a data: URL. Used to disambiguate "paste an image URL in the logo box"
 *  from "paste a website URL" — the latter auto-routes to the website
 *  section. Query strings are tolerated. */
function isImageUrl(raw: string): boolean {
  const val = raw.trim();
  if (!val) return false;
  if (/^data:image\//i.test(val)) return true;
  try {
    const u = new URL(/^https?:\/\//i.test(val) ? val : `https://${val}`);
    return /\.(png|jpe?g|gif|webp|avif|svg|bmp|ico)(\?.*)?$/i.test(u.pathname);
  } catch {
    return false;
  }
}

/** True for a parseable http(s) URL with a dotted hostname. Used to gate
 *  website-section adds: free-form text like "mybrand" is rejected. */
function isValidHttpUrl(raw: string): boolean {
  const val = raw.trim();
  if (!val) return false;
  try {
    const u = new URL(/^https?:\/\//i.test(val) ? val : `https://${val}`);
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.includes('.');
  } catch {
    return false;
  }
}

/** Fetch a remote asset (or pass through a data: URL) and return a Blob.
 *  Returns null on fetch failure so callers can skip or fall back. */
async function fetchAsBlob(src: string): Promise<Blob | null> {
  if (src.startsWith('data:')) {
    try {
      const res = await fetch(src);
      return await res.blob();
    } catch {
      return null;
    }
  }
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

function extOf(src: string): string {
  if (src.startsWith('data:')) {
    const m = src.match(/^data:image\/([a-z0-9]+)/i);
    return m?.[1] ?? 'png';
  }
  const m = src.match(/\.([a-z0-9]+)(?:\?.*)?$/i);
  return (m?.[1] ?? 'jpg').toLowerCase();
}

/** Fetch title + OG image + favicon + screenshot via Microlink. Returns
 *  null on failure — caller should fall back to the letter mark. The
 *  `waitFor=3000` gives single-page apps three seconds to paint past any
 *  preloader; `screenshot=true` only runs when the page renders. */
async function fetchSitePreview(url: string): Promise<{
  preview: string | null;
  favicon: string | null;
  title: string | null;
} | null> {
  try {
    const api = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=true&waitFor=3000`;
    const res = await fetch(api);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      status?: string;
      data?: {
        title?: string | null;
        image?: { url?: string | null } | null;
        logo?: { url?: string | null } | null;
        screenshot?: { url?: string | null } | null;
      };
    };
    if (json.status !== 'success' || !json.data) return null;
    const og = json.data.image?.url ?? null;
    const shot = json.data.screenshot?.url ?? null;
    return {
      preview: og ?? shot ?? null,
      favicon: json.data.logo?.url ?? null,
      title: json.data.title ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Setup — the primary workspace page of the new UI.
 *
 * This page replaces the legacy "Sitemap" concept: a single surface where
 * every ingredient of a brand (logo, color, typography, iconography,
 * photography, website, voice) lives side-by-side with a progress rail on
 * the left and a live editorial preview on the right.
 *
 * The page is presentational for now — all state is local and seeded from
 * `mockBrand`. Wiring points (TODOs inline) are where persistence should
 * land once auth/backend integration resumes.
 */
export function SetupPage({
  initialBrand,
  onPersist,
  brandId: brandIdProp,
}: {
  initialBrand?: MockBrand;
  /**
   * Called (debounced) on every change to local brand state so the
   * parent can persist edits back to the store / Supabase. The parent
   * is responsible for translating MockBrand → Partial<Brand> and
   * invoking the appropriate store action.
   */
  onPersist?: (next: MockBrand) => void;
  /**
   * The real Brand.id corresponding to this SetupPage, when it's
   * mounted inside a brand-scoped route (/b/:slug/setup). Lets the
   * embedded typescale dialog (and future integrations) save directly
   * against the right brand without a brittle name-match lookup. When
   * omitted (e.g. the workspace /setup route), we fall back to a
   * name-match against the brand store so the button still lights up.
   */
  brandId?: string;
} = {}) {
  // Seed from `initialBrand` when provided (e.g. the /b/:slug/setup wrapper
  // maps a real Brand → MockBrand before passing it). Falls back to the
  // hard-coded Nuworld mock when rendered at the flat /setup route or
  // when no brand resolves.
  const [brand, setBrand] = useState<MockBrand>(initialBrand ?? mockBrand);

  // Debounced persistence: after any mutation settles (400ms of
  // stillness), hand the full brand state up to the parent. Skip the
  // initial mount so hydration from `initialBrand` doesn't round-trip.
  const isInitialMount = useRef(true);
  const persistRef = useRef(onPersist);
  persistRef.current = onPersist;
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!persistRef.current) return;
    const handle = window.setTimeout(() => {
      persistRef.current?.(brand);
    }, 400);
    return () => window.clearTimeout(handle);
  }, [brand]);

  // Live font registration. The typography preview reads `font.family`
  // straight to CSS — so the moment files exist for a family, push
  // them to document.fonts via @font-face. Families without uploads
  // hit Google Fonts. This runs on every brand mutation, but the
  // loader caches per-cut so the actual work only happens on changes.
  useEffect(() => {
    for (const f of brand.fonts) {
      if (!f.family) continue;
      if (f.files && f.files.length > 0) {
        registerUploadedFontFamily(f.family, f.files);
      } else {
        loadFontFamily(f.family);
      }
    }
  }, [brand.fonts]);
  const [activeKey, setActiveKey] = useState<SectionKey | null>('logo');
  const [typescaleOpen, setTypescaleOpen] = useState(false);
  // The brand-scoped wrapper (/b/:slug/setup) threads the real Brand.id in
  // as a prop — prefer that. Only fall back to the name-match lookup when
  // the prop is absent (e.g. the workspace /setup route mounts SetupPage
  // with just the Nuworld mock and no real brand yet).
  const fallbackBrandId = useBrandStore((s) => {
    const name = brand.name.trim().toLowerCase();
    if (!name) return undefined;
    const match =
      (s.current && s.current.name.trim().toLowerCase() === name ? s.current : undefined) ??
      s.list.find((b) => b.name.trim().toLowerCase() === name);
    return match?.id;
  });
  const resolvedBrandId = brandIdProp ?? fallbackBrandId;
  const [uploadKind, setUploadKind] = useState<UploadKind | null>(null);
  // When set, the next committed upload replaces this logo in place.
  const [replaceLogoId, setReplaceLogoId] = useState<string | null>(null);
  // Same idea for photos.
  const [replacePhotoId, setReplacePhotoId] = useState<string | null>(null);
  // Same idea for fonts — URL-input in the modal replaces this font.
  const [replaceFontId, setReplaceFontId] = useState<string | null>(null);
  // Same idea for websites.
  const [replaceWebsiteId, setReplaceWebsiteId] = useState<string | null>(null);
  // About-section editor — either a new entry (no id) or an existing one.
  const [aboutEditing, setAboutEditing] = useState<AboutEditorInitial | null>(null);
  // Lightbox preview for logos / photos. Null when nothing is open.
  const [preview, setPreview] = useState<PreviewData | null>(null);

  const handleUpdateColor = useCallback(
    (group: ColorGroupKey, index: number, hex: string) => {
      setBrand((prev) => {
        const list = prev.colors[group];
        if (!list[index]) return prev;
        const nextList = list.slice();
        // The display name follows the hex — editing #000 into a red
        // shouldn't keep calling the swatch "Black".
        nextList[index] = { ...nextList[index], hex, name: hexToName(hex) };
        return {
          ...prev,
          colors: { ...prev.colors, [group]: nextList },
        };
      });
    },
    [],
  );

  const handleDeleteColor = useCallback(
    (group: ColorGroupKey, index: number) => {
      setBrand((prev) => ({
        ...prev,
        colors: {
          ...prev.colors,
          [group]: prev.colors[group].filter((_, i) => i !== index),
        },
      }));
    },
    [],
  );

  const handleMoveColor = useCallback(
    (from: ColorGroupKey, to: ColorGroupKey, index: number) => {
      if (from === to) return;
      setBrand((prev) => {
        const src = prev.colors[from];
        const item = src[index];
        if (!item) return prev;
        return {
          ...prev,
          colors: {
            ...prev.colors,
            [from]: src.filter((_, i) => i !== index),
            [to]: [...prev.colors[to], item],
          },
        };
      });
    },
    [],
  );

  const handleSetColorRole = useCallback(
    (group: ColorGroupKey, index: number, role: 'primary' | 'secondary') => {
      if (group !== 'core') return;
      const targetIndex = role === 'primary' ? 0 : 1;
      setBrand((prev) => {
        const list = prev.colors.core;
        if (index === targetIndex) return prev;
        const item = list[index];
        if (!item) return prev;
        const without = list.filter((_, i) => i !== index);
        const clampedTarget = Math.min(targetIndex, without.length);
        const next = [
          ...without.slice(0, clampedTarget),
          item,
          ...without.slice(clampedTarget),
        ];
        return { ...prev, colors: { ...prev.colors, core: next } };
      });
    },
    [],
  );

  const handleDownloadColor = useCallback((color: { hex: string; name: string }) => {
    const slug = slugify(color.name);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><title>${color.name} ${color.hex}</title><rect width="512" height="512" fill="${color.hex}"/></svg>`;
    downloadBlob(
      new Blob([svg], { type: 'image/svg+xml' }),
      `${slug}-${color.hex.replace('#', '').toLowerCase()}.svg`,
    );
  }, []);

  const handleCopyText = useCallback(async (text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        toast.success(`Copied: ${text}`);
        return;
      }
    } catch {
      /* fall through */
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      toast.success(`Copied: ${text}`);
    } catch {
      toast.error('Copy failed');
    }
    document.body.removeChild(ta);
  }, []);

  const handleAddColor = useCallback(
    (group: Exclude<ColorGroupKey, 'grey'>, hex: string) => {
      setBrand((prev) => {
        const list = prev.colors[group];
        const base = hexToName(hex);
        const taken = new Set(list.map((c) => c.name));
        let name = base;
        let n = 2;
        while (taken.has(name)) {
          name = `${base} ${n}`;
          n += 1;
        }
        return {
          ...prev,
          colors: {
            ...prev.colors,
            [group]: [...list, { hex, name }],
          },
        };
      });
    },
    [],
  );

  const sectionRefs = useRef<SetupBoardRefs>({
    logo: null,
    colors: null,
    fonts: null,
    icons: null,
    photos: null,
    website: null,
    voice: null,
  });

  const completed = useMemo(() => {
    let n = 0;
    if (brand.logos.length) n += 1;
    if (brand.colors.core.length) n += 1;
    if (brand.fonts.length) n += 1;
    if (brand.icons.length) n += 1;
    if (brand.websites.length) n += 1;
    if (brand.about.some((a) => a.content.trim().length > 0)) n += 1;
    return n;
  }, [brand]);

  const handleJump = useCallback((key: SectionKey) => {
    setActiveKey(key);
    const el = sectionRefs.current[key];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleEdit = useCallback((key: SectionKey) => {
    setActiveKey(key);
    if (UPLOAD_KINDS.has(key)) {
      setUploadKind(key as UploadKind);
      return;
    }
    if (key === 'voice') {
      setAboutEditing({ title: '', content: '' });
      return;
    }
    toast(`Edit ${key}`, {
      description: 'Editors will open here once the backend integration lands.',
    });
  }, []);

  // Click-through for the sidebar + chip: jump to the section, then
  // trigger the same add flow the user would get from that section's on-
  // board "+" button. Colors is special — its add lives in a popover that
  // anchors to the board's trigger, so we scroll and synthesise a click
  // on that trigger instead of routing through the upload modal.
  const handleSidebarAdd = useCallback(
    (key: SectionKey) => {
      handleJump(key);
      if (key === 'colors') {
        window.setTimeout(() => {
          const btn = document.querySelector<HTMLButtonElement>(
            'button[data-add-color-trigger="colors"]',
          );
          btn?.click();
        }, 320);
        return;
      }
      if (key === 'voice') {
        setAboutEditing({ title: '', content: '' });
        return;
      }
      if (UPLOAD_KINDS.has(key)) {
        setUploadKind(key as UploadKind);
      }
    },
    [handleJump],
  );

  const handleCloseUpload = useCallback(() => {
    setUploadKind(null);
    setReplaceLogoId(null);
    setReplacePhotoId(null);
    setReplaceFontId(null);
    setReplaceWebsiteId(null);
  }, []);

  const handleAddFont = useCallback(
    (family: string, weights?: string[], files?: import('./data/mockBrand').BrandFontFile[]) => {
      setBrand((prev) => {
        if (prev.fonts.length >= MAX_FONTS) return prev;
        // Lenient family match — handles the common case where the
        // user uploads "GT-Super-Display-Bold.ttf" (parsed as "GT
        // Super Display") and the brand already declares "GT Super".
        // Either family being a prefix of the other counts as the
        // same family, so the upload attaches to the existing entry
        // instead of creating a stray "GT Super Display" alongside.
        const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');
        const target = norm(family);
        const existing = prev.fonts.find((f) => {
          const candidate = norm(f.family);
          if (candidate === target) return true;
          if (candidate.length >= 3 && target.startsWith(candidate)) return true;
          if (target.length >= 3 && candidate.startsWith(target)) return true;
          return false;
        });
        if (existing) {
          if (!files || files.length === 0) return prev;
          return {
            ...prev,
            fonts: prev.fonts.map((f) =>
              f === existing ? { ...f, files: dedupeFontFiles([...(f.files ?? []), ...files]) } : f,
            ),
          };
        }
        const id = `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const nextRole =
          prev.fonts.length === 0 ? 'Display' : prev.fonts.length === 1 ? 'Text' : 'Support';
        const weightsLabel =
          weights && weights.length > 0
            ? weights.join(' · ')
            : 'Regular · Medium · Bold';
        const next = {
          id,
          family,
          role: nextRole,
          weights: weightsLabel,
          fallback: 'system-ui, sans-serif',
          ...(files && files.length > 0 ? { files: dedupeFontFiles(files) } : {}),
        };
        return { ...prev, fonts: [...prev.fonts, next] };
      });
    },
    [],
  );

  /** Accepts N families discovered from a folder / multi-file drop. Adds
   *  each as a single font entry (with its weights), up to MAX_FONTS. If
   *  the user is in replace-mode, the first family replaces the target
   *  and the rest are added. */
  const handleAddFontFamilies = useCallback(
    (
      families: Array<{
        family: string;
        weights: string[];
        files?: import('./data/mockBrand').BrandFontFile[];
      }>,
    ) => {
      if (families.length === 0) return;
      if (replaceFontId) {
        const [first, ...rest] = families;
        setBrand((prev) => ({
          ...prev,
          fonts: prev.fonts.map((f) =>
            f.id === replaceFontId
              ? {
                  ...f,
                  family: first.family,
                  weights:
                    first.weights.length > 0
                      ? first.weights.join(' · ')
                      : f.weights,
                  ...(first.files && first.files.length > 0
                    ? { files: dedupeFontFiles(first.files) }
                    : {}),
                }
              : f,
          ),
        }));
        setReplaceFontId(null);
        rest.forEach(({ family, weights, files }) =>
          handleAddFont(family, weights, files),
        );
      } else {
        families.forEach(({ family, weights, files }) =>
          handleAddFont(family, weights, files),
        );
      }
      setUploadKind(null);
    },
    [replaceFontId, handleAddFont],
  );

  const handleReplaceFontUrl = useCallback((id: string, family: string) => {
    setBrand((prev) => ({
      ...prev,
      fonts: prev.fonts.map((f) => (f.id === id ? { ...f, family } : f)),
    }));
  }, []);

  const handleDeleteIcon = useCallback((name: string) => {
    setBrand((prev) => {
      const idx = prev.icons.indexOf(name);
      if (idx === -1) return prev;
      const next = prev.icons.slice();
      next.splice(idx, 1);
      return { ...prev, icons: next };
    });
  }, []);

  /** Grab the SVG node from the right-clicked tile and zip it as three
   *  copies — svg/, png/, and jpg/ — so the user gets a ready-to-ship
   *  icon pack whatever format they need downstream. The marquee renders
   *  duplicate tiles to fill the track, so we rely on the triggering
   *  element rather than re-rendering from the icon component. */
  const handleDownloadIcon = useCallback(
    async (name: string, anchor: HTMLElement) => {
      const svgNode = anchor.querySelector('svg');
      if (!svgNode) return;
      const svgText = serializeSvgNode(svgNode as SVGElement);
      const slug = slugify(name);
      try {
        const [pngBlob, jpgBlob] = await Promise.all([
          svgToRasterBlob(svgText, 'image/png', 512),
          svgToRasterBlob(svgText, 'image/jpeg', 512),
        ]);
        await buildZip(`${slug}-icon.zip`, (zip) => {
          zip.file(`svg/${slug}.svg`, svgText);
          zip.file(`png/${slug}.png`, pngBlob);
          zip.file(`jpg/${slug}.jpg`, jpgBlob);
        });
      } catch {
        // Rasterization failed (rare — safari taint). Fall back to the
        // raw SVG so the user still gets something.
        downloadBlob(
          new Blob([svgText], { type: 'image/svg+xml' }),
          `${slug}.svg`,
        );
      }
    },
    [],
  );

  const handleDeleteFont = useCallback((id: string) => {
    setBrand((prev) => ({
      ...prev,
      fonts: prev.fonts.filter((f) => f.id !== id),
    }));
  }, []);

  /** Zip the Google Fonts woff2 files for this family together with a
   *  drop-in CSS snippet. If Google Fonts can't be reached (offline /
   *  CORS), fall back to a CSS-only file so the user still gets the
   *  correct @import they can paste into a stylesheet. */
  const handleDownloadFont = useCallback(
    async (font: MockBrand['fonts'][number]) => {
      const family = font.family;
      const slug = slugify(family);
      const fallback = font.fallback ?? 'sans-serif';
      const usageCss = [
        `/* ${family} — BrandOS export */`,
        `:root {`,
        `  --font-${slug}: "${family}", ${fallback};`,
        `}`,
        ``,
        `.${slug} {`,
        `  font-family: "${family}", ${fallback};`,
        `}`,
        ``,
      ].join('\n');
      const pkg = await fetchGoogleFontPackage(family);
      if (!pkg || (pkg.ttfFiles.length === 0 && pkg.woff2Files.length === 0)) {
        const encoded = encodeURIComponent(family).replace(/%20/g, '+');
        const cssOnly = [
          `/* ${family} — BrandOS export (CSS only — couldn't fetch font files) */`,
          `@import url('https://fonts.googleapis.com/css2?family=${encoded}:wght@400;500;600;700&display=swap');`,
          ``,
          usageCss,
        ].join('\n');
        downloadBlob(new Blob([cssOnly], { type: 'text/css' }), `${slug}.css`);
        return;
      }
      await buildZip(`${slug}-font.zip`, (zip) => {
        if (pkg.ttfFiles.length > 0) {
          const ttf = zip.folder('ttf');
          pkg.ttfFiles.forEach(({ name, blob }) => ttf?.file(name, blob));
        }
        if (pkg.woff2Files.length > 0) {
          const woff2 = zip.folder('woff2');
          pkg.woff2Files.forEach(({ name, blob }) => woff2?.file(name, blob));
        }
        zip.file('fonts.css', pkg.fontsCss);
        zip.file('usage.css', usageCss);
      });
    },
    [],
  );

  const handleReplaceFont = useCallback((id: string) => {
    setReplaceFontId(id);
    setUploadKind('fonts');
  }, []);

  const patchWebsite = useCallback(
    (id: string, patch: Partial<MockBrand['websites'][number]>) => {
      setBrand((prev) => ({
        ...prev,
        websites: prev.websites.map((w) => (w.id === id ? { ...w, ...patch } : w)),
      }));
    },
    [],
  );

  const refreshWebsitePreview = useCallback(
    async (id: string, url: string) => {
      patchWebsite(id, { loading: true, preview: null, favicon: null, title: null });
      const result = await fetchSitePreview(url);
      if (!result) {
        patchWebsite(id, { loading: false });
        return;
      }
      patchWebsite(id, {
        loading: false,
        preview: result.preview,
        favicon: result.favicon,
        title: result.title,
      });
    },
    [patchWebsite],
  );

  const handleAddWebsite = useCallback(
    (rawUrl: string) => {
      const url = normalizeWebsiteUrl(rawUrl);
      if (!url) return;
      if (!isValidHttpUrl(url)) {
        toast.error('That doesn’t look like a real URL', {
          description: 'Try something like https://brand.example.com',
        });
        return;
      }
      const id = `w-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      let didAdd = false;
      setBrand((prev) => {
        if (prev.websites.length >= MAX_WEBSITES) return prev;
        didAdd = true;
        return {
          ...prev,
          websites: [
            ...prev.websites,
            { id, url, live: false, loading: true, preview: null, favicon: null, title: null },
          ],
        };
      });
      if (didAdd) void refreshWebsitePreview(id, url);
    },
    [refreshWebsitePreview],
  );

  const handleReplaceWebsiteUrl = useCallback(
    (id: string, rawUrl: string) => {
      const url = normalizeWebsiteUrl(rawUrl);
      if (!url) return;
      if (!isValidHttpUrl(url)) {
        toast.error('That doesn’t look like a real URL', {
          description: 'Try something like https://brand.example.com',
        });
        return;
      }
      patchWebsite(id, { url });
      void refreshWebsitePreview(id, url);
    },
    [patchWebsite, refreshWebsitePreview],
  );

  const handleDeleteWebsite = useCallback((id: string) => {
    setBrand((prev) => ({
      ...prev,
      websites: prev.websites.filter((w) => w.id !== id),
    }));
  }, []);

  const handleReplaceWebsite = useCallback((id: string) => {
    setReplaceWebsiteId(id);
    setUploadKind('website');
  }, []);

  const handleOpenWebsiteAdd = useCallback(() => {
    setUploadKind('website');
  }, []);

  const handleAddLogoFromUrl = useCallback((src: string) => {
    const id = `u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const svg = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><image href="${src}" x="0" y="0" width="200" height="200" preserveAspectRatio="xMidYMid meet"/></svg>`;
    setBrand((prev) => ({
      ...prev,
      logos: [...prev.logos, { id, label: 'Logo', variant: 'light', svg }],
    }));
  }, []);

  const handleReplaceLogoFromUrl = useCallback((id: string, src: string) => {
    const svg = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><image href="${src}" x="0" y="0" width="200" height="200" preserveAspectRatio="xMidYMid meet"/></svg>`;
    setBrand((prev) => ({
      ...prev,
      logos: prev.logos.map((l) => (l.id === id ? { ...l, svg } : l)),
    }));
  }, []);

  const handleAddPhotoFromUrl = useCallback((src: string) => {
    setBrand((prev) => {
      const used = new Set(prev.photos.map((p) => p.slot));
      const PHOTO_SLOTS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
      const nextSlot = PHOTO_SLOTS.find((s) => !used.has(s));
      if (!nextSlot) return prev;
      const id = `u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      return { ...prev, photos: [...prev.photos, { id, src, slot: nextSlot }] };
    });
  }, []);

  const handleReplacePhotoFromUrl = useCallback((id: string, src: string) => {
    setBrand((prev) => ({
      ...prev,
      photos: prev.photos.map((p) => (p.id === id ? { ...p, src } : p)),
    }));
  }, []);

  const handleUrlCommit = useCallback(
    (url: string, kind: UploadKind) => {
      if (kind === 'fonts') {
        const family = deriveFontFamilyFromInput(url);
        if (!family) return;
        if (replaceFontId) {
          handleReplaceFontUrl(replaceFontId, family);
          setReplaceFontId(null);
        } else {
          handleAddFont(family);
        }
        setUploadKind(null);
        return;
      }
      if (kind === 'website') {
        if (replaceWebsiteId) {
          handleReplaceWebsiteUrl(replaceWebsiteId, url);
          setReplaceWebsiteId(null);
        } else {
          handleAddWebsite(url);
        }
        setUploadKind(null);
        return;
      }
      // Logo / photos accept direct image URLs. If the user pasted a
      // regular website URL instead, we auto-route it into the website
      // section so the paste isn't wasted. Anything that isn't an image
      // OR a valid URL shows an error.
      if (kind === 'logo' || kind === 'photos') {
        if (isImageUrl(url)) {
          const src = /^https?:\/\//i.test(url) || /^data:/i.test(url) ? url : `https://${url}`;
          if (kind === 'logo') {
            if (replaceLogoId) {
              handleReplaceLogoFromUrl(replaceLogoId, src);
              setReplaceLogoId(null);
            } else {
              handleAddLogoFromUrl(src);
            }
          } else {
            if (replacePhotoId) {
              handleReplacePhotoFromUrl(replacePhotoId, src);
              setReplacePhotoId(null);
            } else {
              handleAddPhotoFromUrl(src);
            }
          }
          setUploadKind(null);
          return;
        }
        if (isValidHttpUrl(url)) {
          toast.info('Saved to Website', {
            description: 'That looks like a page, not an image — added as a website tab.',
          });
          handleAddWebsite(url);
          setUploadKind(null);
          return;
        }
        toast.error('Paste an image URL', {
          description: 'Expected a direct image link (.png · .jpg · .svg · …).',
        });
        return;
      }
    },
    [
      replaceFontId,
      replaceWebsiteId,
      replaceLogoId,
      replacePhotoId,
      handleAddFont,
      handleReplaceFontUrl,
      handleAddWebsite,
      handleReplaceWebsiteUrl,
      handleAddLogoFromUrl,
      handleReplaceLogoFromUrl,
      handleAddPhotoFromUrl,
      handleReplacePhotoFromUrl,
    ],
  );

  const handleCommitAsset = useCallback(
    (asset: CommittedAsset, kind: UploadKind) => {
      // Fonts don't flow through here anymore — UploadModal groups font
      // files by family and calls onFontFamilies. Leave this branch for
      // images/icons/photos only.
      if (kind === 'fonts') return;
      const id = `u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setBrand((prev) => {
        if (kind === 'photos') {
          if (replacePhotoId) {
            return {
              ...prev,
              photos: prev.photos.map((p) =>
                p.id === replacePhotoId ? { ...p, src: asset.dataUrl } : p,
              ),
            };
          }
          // Append to first unused bento slot; cap at 6.
          const used = new Set(prev.photos.map((p) => p.slot));
          const PHOTO_SLOTS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
          const nextSlot = PHOTO_SLOTS.find((s) => !used.has(s));
          if (!nextSlot) return prev;
          return { ...prev, photos: [...prev.photos, { id, src: asset.dataUrl, slot: nextSlot }] };
        }
        if (kind === 'logo') {
          const svg =
            asset.svg ??
            `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><image href="${asset.dataUrl}" x="0" y="0" width="200" height="200" preserveAspectRatio="xMidYMid meet"/></svg>`;
          const label = (asset.name || 'Logo').replace(/\.[^.]+$/, '');
          // Replace in place when a target id is set; otherwise append.
          if (replaceLogoId) {
            return {
              ...prev,
              logos: prev.logos.map((l) =>
                l.id === replaceLogoId ? { ...l, label, svg } : l,
              ),
            };
          }
          return {
            ...prev,
            logos: [...prev.logos, { id, label, variant: 'light', svg }],
          };
        }
        if (kind === 'icons') {
          const label = (asset.name || 'Icon').replace(/\.[^.]+$/, '');
          return { ...prev, icons: [...prev.icons, label] };
        }
        return prev;
      });
      // Clear any replace-target after the first successful commit.
      if (replaceLogoId) setReplaceLogoId(null);
      if (replacePhotoId) setReplacePhotoId(null);
    },
    [replaceLogoId, replacePhotoId, replaceFontId, handleAddFont, handleReplaceFontUrl],
  );

  const handleEditAbout = useCallback(
    (id: string) => {
      const entry = brand.about.find((a) => a.id === id);
      if (!entry) return;
      setAboutEditing({ id: entry.id, title: entry.title, content: entry.content });
    },
    [brand.about],
  );

  const handleSaveAbout = useCallback(
    ({ id, title, content }: { id?: string; title: string; content: string }) => {
      setBrand((prev) => {
        if (id) {
          return {
            ...prev,
            about: prev.about.map((a) =>
              a.id === id ? { ...a, title, content } : a,
            ),
          };
        }
        // New entry — if a pre-seeded (empty-content) slot already holds
        // this title, fill that one in place rather than creating a dup.
        const existingEmpty = prev.about.find(
          (a) => !a.content.trim() && a.title.toLowerCase() === title.toLowerCase(),
        );
        if (existingEmpty) {
          return {
            ...prev,
            about: prev.about.map((a) =>
              a.id === existingEmpty.id ? { ...a, title, content } : a,
            ),
          };
        }
        const base =
          title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') ||
          'section';
        const taken = new Set(prev.about.map((a) => a.id));
        let newId = base;
        let n = 2;
        while (taken.has(newId)) {
          newId = `${base}-${n}`;
          n += 1;
        }
        return { ...prev, about: [...prev.about, { id: newId, title, content }] };
      });
      setAboutEditing(null);
    },
    [],
  );

  const handleDropFiles = useCallback(
    (kind: 'logo' | 'photos', files: File[]) => {
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result ?? '');
          if (!dataUrl) return;
          let svg: string | undefined;
          if (file.type === 'image/svg+xml') {
            const textReader = new FileReader();
            textReader.onload = () => {
              svg = String(textReader.result ?? '') || undefined;
              handleCommitAsset(
                { name: file.name, size: file.size, type: file.type, dataUrl, svg },
                kind,
              );
            };
            textReader.readAsText(file);
            return;
          }
          handleCommitAsset(
            { name: file.name, size: file.size, type: file.type, dataUrl },
            kind,
          );
        };
        reader.readAsDataURL(file);
      });
    },
    [handleCommitAsset],
  );

  const handleDownloadAbout = useCallback(
    (entry: MockBrand['about'][number]) => {
      const slug = entry.title.trim().toLowerCase().replace(/\s+/g, '-') || 'section';
      const brandSlug =
        brand.name.trim().toLowerCase().replace(/\s+/g, '-') || 'brand';
      const body = `# ${entry.title}\n\n${entry.content}\n`;
      const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${brandSlug}-${slug}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [brand.name],
  );

  const handleDeleteAbout = useCallback((id: string) => {
    setBrand((prev) => ({
      ...prev,
      about: prev.about.filter((a) => a.id !== id),
    }));
    setAboutEditing(null);
  }, []);

  /** Section-wide export — the "download" button in each section header
   *  hands the user a zip with every asset in that section, organized
   *  into sensible folders by format. Skips sections that are empty so
   *  the user doesn't end up with a 0-entry archive. */
  const handleExportSection = useCallback(
    async (key: SectionKey) => {
      const brandSlug = slugify(brand.name);
      const filename = `${brandSlug}-${key}.zip`;

      if (key === 'logo') {
        if (brand.logos.length === 0) return;
        await buildZip(filename, (zip) => {
          brand.logos.forEach((logo, i) => {
            const name = slugify(logo.label || `logo-${i + 1}`);
            zip.file(`${name}.svg`, logo.svg);
          });
        });
        return;
      }

      if (key === 'colors') {
        const { core, accent, grey } = brand.colors;
        if (core.length + accent.length + grey.length === 0) return;
        await buildZip(filename, (zip) => {
          const groups: Array<[string, MockBrand['colors']['core']]> = [
            ['core', core],
            ['accent', accent],
            ['grey', grey],
          ];
          const lines: string[] = [`# ${brand.name} — color palette`, ''];
          for (const [groupName, list] of groups) {
            if (list.length === 0) continue;
            lines.push(`## ${groupName}`);
            const folder = zip.folder(groupName);
            list.forEach((color) => {
              const slug = slugify(color.name);
              const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><title>${color.name} ${color.hex}</title><rect width="512" height="512" fill="${color.hex}"/></svg>`;
              folder?.file(`${slug}.svg`, svg);
              lines.push(`- ${color.name} — ${color.hex}`);
            });
            lines.push('');
          }
          zip.file('palette.md', lines.join('\n'));
        });
        return;
      }

      if (key === 'fonts') {
        if (brand.fonts.length === 0) return;
        await buildZip(filename, async (zip) => {
          const indexLines: string[] = [`# ${brand.name} — typography`, ''];
          for (const font of brand.fonts) {
            const slug = slugify(font.family);
            const familyFolder = zip.folder(slug);
            const fallback = font.fallback ?? 'sans-serif';
            const usageCss = [
              `/* ${font.family} — BrandOS export */`,
              `:root { --font-${slug}: "${font.family}", ${fallback}; }`,
              `.${slug} { font-family: "${font.family}", ${fallback}; }`,
              '',
            ].join('\n');
            const pkg = await fetchGoogleFontPackage(font.family);
            if (pkg && (pkg.ttfFiles.length > 0 || pkg.woff2Files.length > 0)) {
              if (pkg.ttfFiles.length > 0) {
                const ttf = familyFolder?.folder('ttf');
                pkg.ttfFiles.forEach(({ name, blob }) =>
                  ttf?.file(name, blob),
                );
              }
              if (pkg.woff2Files.length > 0) {
                const woff2 = familyFolder?.folder('woff2');
                pkg.woff2Files.forEach(({ name, blob }) =>
                  woff2?.file(name, blob),
                );
              }
              familyFolder?.file('fonts.css', pkg.fontsCss);
            } else {
              const encoded = encodeURIComponent(font.family).replace(/%20/g, '+');
              familyFolder?.file(
                'fonts.css',
                `@import url('https://fonts.googleapis.com/css2?family=${encoded}:wght@400;500;600;700&display=swap');\n`,
              );
            }
            familyFolder?.file('usage.css', usageCss);
            indexLines.push(`## ${font.role} — ${font.family}`);
            indexLines.push(`- Weights: ${font.weights}`);
            indexLines.push(`- Fallback: ${fallback}`);
            indexLines.push('');
          }
          zip.file('README.md', indexLines.join('\n'));
        });
        return;
      }

      if (key === 'icons') {
        if (brand.icons.length === 0) return;
        const iconMap = ICON_MAP();
        await buildZip(filename, async (zip) => {
          const svgFolder = zip.folder('svg');
          const pngFolder = zip.folder('png');
          const jpgFolder = zip.folder('jpg');
          for (const name of brand.icons) {
            const Comp = iconMap[name as keyof typeof iconMap];
            if (!Comp) continue;
            const slug = slugify(name);
            const svgText = renderIconToSvg(createElement(Comp, { size: 24 }));
            svgFolder?.file(`${slug}.svg`, svgText);
            try {
              const [png, jpg] = await Promise.all([
                svgToRasterBlob(svgText, 'image/png', 512),
                svgToRasterBlob(svgText, 'image/jpeg', 512),
              ]);
              pngFolder?.file(`${slug}.png`, png);
              jpgFolder?.file(`${slug}.jpg`, jpg);
            } catch {
              /* skip raster variants if rasterization fails */
            }
          }
        });
        return;
      }

      if (key === 'photos') {
        if (brand.photos.length === 0) return;
        await buildZip(filename, async (zip) => {
          const folder = zip.folder('photos');
          for (const photo of brand.photos) {
            const ext = extOf(photo.src);
            const blob = await fetchAsBlob(photo.src);
            if (blob) folder?.file(`photo-${photo.slot}.${ext}`, blob);
          }
        });
        return;
      }

      if (key === 'website') {
        if (brand.websites.length === 0) return;
        await buildZip(filename, (zip) => {
          const lines: string[] = [
            `# ${brand.name} — websites`,
            '',
            ...brand.websites.map((w) =>
              `- ${w.title ? `${w.title} — ` : ''}${w.url}${w.live ? ' (live)' : ''}`,
            ),
            '',
          ];
          zip.file('websites.md', lines.join('\n'));
          zip.file(
            'websites.json',
            JSON.stringify(
              brand.websites.map((w) => ({
                url: w.url,
                title: w.title ?? null,
                live: !!w.live,
              })),
              null,
              2,
            ),
          );
        });
        return;
      }

      if (key === 'voice') {
        const filled = brand.about.filter((a) => a.content.trim().length > 0);
        if (filled.length === 0) return;
        await buildZip(filename, (zip) => {
          const folder = zip.folder('about');
          filled.forEach((entry) => {
            const slug = slugify(entry.title);
            const body = `# ${entry.title}\n\n${entry.content}\n`;
            folder?.file(`${slug}.md`, body);
          });
        });
        return;
      }
    },
    [brand],
  );

  const handleDeleteLogo = useCallback((id: string) => {
    setBrand((prev) => ({
      ...prev,
      logos: prev.logos.filter((l) => l.id !== id),
    }));
  }, []);

  /** Right-click → Change logo type. Reassigns the tile's role; if another
   *  logo already holds that role the two swap. Primary always renders (and
   *  persists) first, and the tile bg re-tints for light/dark variants. */
  const handleChangeLogoRole = useCallback((id: string, roleId: string) => {
    const role = LOGO_ROLES.find((r) => r.id === roleId);
    if (!role) return;
    const retint = (svg: string, variant: 'light' | 'dark') =>
      svg.replace(
        /(<rect[^>]*fill=")[^"]*(")/,
        `$1${variant === 'dark' ? '#111113' : '#F5F4EF'}$2`,
      );
    setBrand((prev) => {
      const logos = prev.logos.slice();
      const idx = logos.findIndex((l) => l.id === id);
      if (idx < 0 || logos[idx].id === role.id) return prev;
      const current = logos[idx];
      const currentRole = { id: current.id, label: current.label, variant: current.variant };
      const occupiedIdx = logos.findIndex((l, i) => i !== idx && l.id === role.id);
      logos[idx] = {
        ...current,
        id: role.id,
        label: role.label,
        variant: role.variant,
        svg: retint(current.svg, role.variant),
      };
      if (occupiedIdx >= 0) {
        const other = logos[occupiedIdx];
        logos[occupiedIdx] = {
          ...other,
          ...currentRole,
          svg: retint(other.svg, currentRole.variant),
        };
      }
      const pIdx = logos.findIndex((l) => l.id === 'primary');
      if (pIdx > 0) {
        const [p] = logos.splice(pIdx, 1);
        logos.unshift(p);
      }
      return { ...prev, logos };
    });
  }, []);

  const handleDownloadLogo = useCallback(
    (logo: MockBrand['logos'][number]) => {
      const slug = slugify(logo.label || 'logo');
      const brandSlug = slugify(brand.name);
      downloadBlob(
        new Blob([logo.svg], { type: 'image/svg+xml' }),
        `${brandSlug}-${slug}.svg`,
      );
    },
    [brand.name],
  );

  const handleReplaceLogo = useCallback((id: string) => {
    setReplaceLogoId(id);
    setUploadKind('logo');
  }, []);

  const handlePreviewLogo = useCallback(
    (logo: MockBrand['logos'][number]) => {
      setPreview({ kind: 'svg', svg: logo.svg, label: logo.label });
    },
    [],
  );

  const handlePreviewPhoto = useCallback(
    (photo: MockBrand['photos'][number]) => {
      setPreview({ kind: 'image', src: photo.src, label: `Photo ${photo.slot}` });
    },
    [],
  );

  const handleDownloadPhoto = useCallback(
    async (photo: MockBrand['photos'][number]) => {
      const brandSlug = slugify(brand.name);
      const ext = extOf(photo.src);
      const filename = `${brandSlug}-photo-${photo.slot}.${ext}`;
      const blob = await fetchAsBlob(photo.src);
      if (blob) {
        downloadBlob(blob, filename);
        return;
      }
      // Fallback: anchor click so the browser handles the redirect.
      const a = document.createElement('a');
      a.href = photo.src;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    },
    [brand.name],
  );

  const handleDeletePhoto = useCallback((id: string) => {
    setBrand((prev) => ({
      ...prev,
      photos: prev.photos.filter((p) => p.id !== id),
    }));
  }, []);

  const handleReplacePhoto = useCallback((id: string) => {
    setReplacePhotoId(id);
    setUploadKind('photos');
  }, []);

  return (
    <WorkspaceShell
      rightActions={
        <>
          {resolvedBrandId && (
            <button
              type="button"
              onClick={() => setTypescaleOpen(true)}
              className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground"
            >
              Open typescale editor
            </button>
          )}
          <button type="button" className="pill-btn pill-btn--primary">
            <span>Export brand</span>
            <ArrowRight size={14} className="pill-btn-arrow" />
          </button>
        </>
      }
    >
      <div className="shell">
        <SetupSidebar
          brand={brand}
          activeKey={activeKey}
          completed={completed}
          total={6}
          onJump={handleJump}
          onAdd={handleSidebarAdd}
        />
        <SetupBoard
          brand={brand}
          onEdit={handleEdit}
          sectionRefs={sectionRefs}
          onUpdateColor={handleUpdateColor}
          onAddColor={handleAddColor}
          onDeleteColor={handleDeleteColor}
          onMoveColor={handleMoveColor}
          onSetColorRole={handleSetColorRole}
          onDownloadColor={handleDownloadColor}
          onCopyText={handleCopyText}
          onDeleteLogo={handleDeleteLogo}
          onReplaceLogo={handleReplaceLogo}
          onDownloadLogo={handleDownloadLogo}
          onChangeLogoRole={handleChangeLogoRole}
          onPreviewLogo={handlePreviewLogo}
          onDeletePhoto={handleDeletePhoto}
          onReplacePhoto={handleReplacePhoto}
          onDownloadPhoto={handleDownloadPhoto}
          onPreviewPhoto={handlePreviewPhoto}
          onDeleteFont={handleDeleteFont}
          onReplaceFont={handleReplaceFont}
          onDownloadFont={handleDownloadFont}
          onDeleteIcon={handleDeleteIcon}
          onDownloadIcon={handleDownloadIcon}
          canAddFont={brand.fonts.length < MAX_FONTS}
          onDeleteWebsite={handleDeleteWebsite}
          onReplaceWebsite={handleReplaceWebsite}
          onAddWebsite={handleOpenWebsiteAdd}
          canAddWebsite={brand.websites.length < MAX_WEBSITES}
          onEditAbout={handleEditAbout}
          onDeleteAbout={handleDeleteAbout}
          onDownloadAbout={handleDownloadAbout}
          onDropFiles={handleDropFiles}
          onExport={handleExportSection}
        />
      </div>
      <UploadModal
        open={uploadKind !== null}
        kind={uploadKind}
        onClose={handleCloseUpload}
        onCommit={handleCommitAsset}
        onUrl={handleUrlCommit}
        onFontFamilies={handleAddFontFamilies}
      />
      <AboutEditorModal
        open={!!aboutEditing}
        initial={aboutEditing}
        takenTitles={brand.about
          .filter((a) => a.content.trim().length > 0)
          .map((a) => a.title)}
        onClose={() => setAboutEditing(null)}
        onSave={handleSaveAbout}
        onDelete={handleDeleteAbout}
      />
      <PreviewModal data={preview} onClose={() => setPreview(null)} />
      {resolvedBrandId && (
        <EmbeddedTypescaleDialog
          brandId={resolvedBrandId}
          open={typescaleOpen}
          onOpenChange={setTypescaleOpen}
        />
      )}
    </WorkspaceShell>
  );
}

export default SetupPage;
