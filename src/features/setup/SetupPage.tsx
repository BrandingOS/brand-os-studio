import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CosmosWorkspaceShell } from '@/shared/layouts/CosmosWorkspaceShell';
import { mockBrand, type MockBrand } from './data/mockBrand';
import { SetupSidebar, type SectionKey } from './components/SetupSidebar';
import { SetupBoard, type SetupBoardRefs } from './components/SetupBoard';
import { ArrowRight } from './components/SetupIcons';
import { UploadModal, type UploadKind, type CommittedAsset } from './components/UploadModal';
import { VoiceEditorModal } from './components/VoiceEditorModal';
import { PreviewModal, type PreviewData } from './components/PreviewModal';

const UPLOAD_KINDS: ReadonlySet<SectionKey> = new Set<SectionKey>([
  'logo',
  'icons',
  'photos',
  'fonts',
  'website',
]);

const MAX_WEBSITES = 3;
const MAX_FONTS = 4;

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

/** Pull the section-scoped slice of the brand object for download. Used
 *  by the section-header "download" button to hand the user a JSON file
 *  they can diff / archive / paste into another tool. */
function sectionSnapshot(brand: MockBrand, key: SectionKey): unknown {
  switch (key) {
    case 'logo': return { logos: brand.logos };
    case 'colors': return { colors: brand.colors };
    case 'fonts': return { fonts: brand.fonts };
    case 'icons': return { icons: brand.icons };
    case 'photos': return { photos: brand.photos };
    case 'website': return { websites: brand.websites };
    case 'voice': return { voice: brand.voice };
    default: return null;
  }
}

/** Trigger a browser download for either a data URL or a remote asset.
 *  Data URLs are assigned straight to an <a download>; remote URLs go
 *  through fetch() so cross-origin images still save under the given
 *  filename rather than the remote path. Falls back to a direct anchor
 *  click if fetch is blocked by CORS. */
async function downloadFromUrl(src: string, filename: string): Promise<void> {
  const trigger = (href: string, cleanup?: () => void) => {
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (cleanup) setTimeout(cleanup, 1000);
  };
  if (src.startsWith('data:')) {
    trigger(src);
    return;
  }
  try {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    trigger(url, () => URL.revokeObjectURL(url));
  } catch {
    trigger(src);
  }
}

function slugify(s: string): string {
  return (
    s
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item'
  );
}

function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
export function SetupPage() {
  // TODO: swap for a real brand-store read once auth/backend is wired.
  const [brand, setBrand] = useState<MockBrand>(mockBrand);
  const [activeKey, setActiveKey] = useState<SectionKey | null>('logo');
  const [uploadKind, setUploadKind] = useState<UploadKind | null>(null);
  // When set, the next committed upload replaces this logo in place.
  const [replaceLogoId, setReplaceLogoId] = useState<string | null>(null);
  // Same idea for photos.
  const [replacePhotoId, setReplacePhotoId] = useState<string | null>(null);
  // Same idea for fonts — URL-input in the modal replaces this font.
  const [replaceFontId, setReplaceFontId] = useState<string | null>(null);
  // Same idea for websites.
  const [replaceWebsiteId, setReplaceWebsiteId] = useState<string | null>(null);
  // Voice & Tone editor — opens when the user clicks + on that section.
  const [voiceOpen, setVoiceOpen] = useState(false);
  // Lightbox preview for logos / photos. Null when nothing is open.
  const [preview, setPreview] = useState<PreviewData | null>(null);

  const handleUpdateColor = useCallback(
    (group: ColorGroupKey, index: number, hex: string) => {
      setBrand((prev) => {
        const list = prev.colors[group];
        if (!list[index]) return prev;
        const nextList = list.slice();
        nextList[index] = { ...nextList[index], hex };
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

  const handleDownloadColor = useCallback((color: { hex: string; name: string }) => {
    const slug = color.name.trim().toLowerCase().replace(/\s+/g, '-') || 'color';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><title>${color.name} ${color.hex}</title><rect width="512" height="512" fill="${color.hex}"/></svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}-${color.hex.replace('#', '').toLowerCase()}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
        const name = `${group === 'core' ? 'Core' : 'Accent'} ${list.length + 1}`;
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
    if (brand.photos.length) n += 1;
    if (brand.websites.length) n += 1;
    if (brand.voice.essay) n += 1;
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
      setVoiceOpen(true);
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
        setVoiceOpen(true);
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
    (family: string, weights?: string[]) => {
      setBrand((prev) => {
        if (prev.fonts.length >= MAX_FONTS) return prev;
        // Skip if an entry with the same family is already present — the
        // user shouldn't end up with duplicate Instrument Serif rows just
        // because they dropped the same folder twice.
        if (prev.fonts.some((f) => f.family.toLowerCase() === family.toLowerCase())) {
          return prev;
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
    (families: Array<{ family: string; weights: string[] }>) => {
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
                }
              : f,
          ),
        }));
        setReplaceFontId(null);
        rest.forEach(({ family, weights }) => handleAddFont(family, weights));
      } else {
        families.forEach(({ family, weights }) => handleAddFont(family, weights));
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

  /** Grab the SVG node from the right-clicked tile and save it as a
   *  standalone .svg file. The marquee renders duplicate tiles to fill
   *  the track, so we rely on the triggering element rather than
   *  re-rendering from the icon component. */
  const handleDownloadIcon = useCallback(
    (name: string, anchor: HTMLElement) => {
      const svg = anchor.querySelector('svg');
      if (!svg) return;
      const cloned = svg.cloneNode(true) as SVGElement;
      cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      cloned.removeAttribute('class');
      const xml = new XMLSerializer().serializeToString(cloned);
      const payload = xml.startsWith('<?xml') ? xml : `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
      const blob = new Blob([payload], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slugify(name)}.svg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    [],
  );

  const handleDeleteFont = useCallback((id: string) => {
    setBrand((prev) => ({
      ...prev,
      fonts: prev.fonts.filter((f) => f.id !== id),
    }));
  }, []);

  const handleDownloadFont = useCallback(
    (font: MockBrand['fonts'][number]) => {
      // Most "fonts" on this page are referenced by family name rather
      // than a stored file (Google Fonts, uploaded, etc.), so the most
      // useful artefact is a drop-in CSS snippet the user can paste into
      // a project: import link + usage declaration.
      const family = font.family;
      const encoded = encodeURIComponent(family).replace(/%20/g, '+');
      const fallback = font.fallback ?? 'sans-serif';
      const css = [
        `/* ${family} — BrandOS export */`,
        `@import url('https://fonts.googleapis.com/css2?family=${encoded}:wght@400;500;600;700&display=swap');`,
        ``,
        `:root {`,
        `  --font-${slugify(family)}: "${family}", ${fallback};`,
        `}`,
        ``,
        `.${slugify(family)} {`,
        `  font-family: "${family}", ${fallback};`,
        `}`,
        ``,
      ].join('\n');
      const blob = new Blob([css], { type: 'text/css' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slugify(family)}.css`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
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

  const handleSaveVoice = useCallback(
    ({ essay, pillars }: { essay: string; pillars: string[] }) => {
      setBrand((prev) => ({ ...prev, voice: { essay, pillars } }));
      setVoiceOpen(false);
    },
    [],
  );

  const handleExportSection = useCallback(
    (key: SectionKey) => {
      const snapshot = sectionSnapshot(brand, key);
      if (!snapshot) return;
      const slug = brand.name.trim().toLowerCase().replace(/\s+/g, '-') || 'brand';
      downloadJson(snapshot, `${slug}-${key}.json`);
    },
    [brand],
  );

  const handleDeleteLogo = useCallback((id: string) => {
    setBrand((prev) => ({
      ...prev,
      logos: prev.logos.filter((l) => l.id !== id),
    }));
  }, []);

  const handleDownloadLogo = useCallback(
    (logo: MockBrand['logos'][number]) => {
      const slug =
        (logo.label || 'logo').trim().toLowerCase().replace(/\s+/g, '-') || 'logo';
      const brandSlug =
        brand.name.trim().toLowerCase().replace(/\s+/g, '-') || 'brand';
      const blob = new Blob([logo.svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${brandSlug}-${slug}.svg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
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
    (photo: MockBrand['photos'][number]) => {
      const brandSlug = slugify(brand.name) || 'brand';
      const ext = photo.src.startsWith('data:')
        ? (photo.src.match(/^data:image\/([a-z0-9]+)/i)?.[1] ?? 'png')
        : (photo.src.match(/\.([a-z0-9]+)(?:\?.*)?$/i)?.[1] ?? 'jpg');
      void downloadFromUrl(
        photo.src,
        `${brandSlug}-photo-${photo.slot}.${ext.toLowerCase()}`,
      );
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
    <CosmosWorkspaceShell
      rightActions={
        <button type="button" className="pill-btn pill-btn--primary">
          <span>Publish</span>
          <ArrowRight size={14} className="pill-btn-arrow" />
        </button>
      }
    >
      <div className="shell">
        <SetupSidebar
          brand={brand}
          activeKey={activeKey}
          completed={completed}
          total={7}
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
          onDownloadColor={handleDownloadColor}
          onCopyText={handleCopyText}
          onDeleteLogo={handleDeleteLogo}
          onReplaceLogo={handleReplaceLogo}
          onDownloadLogo={handleDownloadLogo}
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
      <VoiceEditorModal
        open={voiceOpen}
        essay={brand.voice.essay}
        pillars={brand.voice.pillars}
        onClose={() => setVoiceOpen(false)}
        onSave={handleSaveVoice}
      />
      <PreviewModal data={preview} onClose={() => setPreview(null)} />
    </CosmosWorkspaceShell>
  );
}

export default SetupPage;
