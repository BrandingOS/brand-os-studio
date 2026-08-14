import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useV4Store } from '../store/onboardingV4Store';
import type { AssetKind, LogoSlot, OnboardingAsset } from '../types';
import { GOOGLE_FONTS } from '@/shared/design-system/googleFonts';
import { enqueueFile, extractDominantColors, genId, normalizeHex } from '../utils/assetUpload';
import { ColorPickerHSV } from '@/features/setup/components/ColorPickerHSV';
import { CopyIcon, type OrganicIconHandle } from '@/features/setup/components/organic-icons';
import { hexToName } from '@/features/setup/data/colorNames';
import { ContextMenu, type ContextMenuState } from '@/features/setup/components/ContextMenu';
import { LogoSlots } from './LogoSlots';
import { AboutGroup } from './AboutGroup';
import { useCosmosTheme } from '../components/useCosmosTheme';
import { SOCIAL_PLATFORMS, detectPlatform, getPlatform } from '../data/socialPlatforms';
import { type FontFamilyGroup, groupFontAssets, weightsSummary } from '../utils/fontFamily';
import { extractSlogan } from '../services/parseDescription';
import { type SuggestedPalette, suggestPalettesFor } from '../data/suggestedPalettes';
import {
  accept,
  acceptSection,
  editAsUser,
  renameBrand,
  saveBusinessFact,
  ORIGIN_LABEL,
  type Projection,
} from '@/features/onboarding/bridge/v4Bridge';
import { VOCABULARIES } from '@/features/onboarding/vocabulary/vocabularies';
import { PATH_LABEL } from '@/features/onboarding/understanding/proposals';
import { type SuggestedFontPairing, suggestFontsFor } from '../data/suggestedFonts';
import { POPULAR_PALETTES } from '../data/popularPalettes';
import { COLOR_HUNT_PALETTES } from '../data/colorHuntPalettes';

/** The shuffle deck: hand-curated classics + the full Color Hunt all-time
 *  popular library (~4k palettes), deduped once at module load. */
const ALL_SHUFFLE_PALETTES: string[][] = (() => {
  const seen = new Set<string>();
  const out: string[][] = [];
  for (const palette of [...POPULAR_PALETTES, ...COLOR_HUNT_PALETTES]) {
    const key = palette.join('').toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(palette);
  }
  return out;
})();

const MAX_ASSETS = 20;

/**
 * How many colours a brand palette holds here.
 *
 * A palette is a decision; eight swatches is a mood board. Extraction, the
 * suggested palettes and manual adds all pass through this, because a cap
 * enforced in one of three places is not a cap.
 */
const MAX_COLORS = 5;

/**
 * The subtitle on a typeface the product proposed rather than the brand chose.
 *
 * An empty Fonts section is a dead end — nothing to react to. A filled one that
 * looks decided is worse, because the user inherits a choice they never made.
 * So the field is never empty and the row says plainly whose choice it is.
 */
const SUGGESTED_FONT_SUB = ORIGIN_LABEL.suggested;

interface Group {
  id: 'fonts' | 'links' | 'assets';
  label: string;
  /** Singular noun for the header count — "1 link", "2 links". */
  noun: string;
  empty: string;
  match: (a: OnboardingAsset) => boolean;
}

const GROUPS: Group[] = [
  {
    id: 'fonts',
    label: 'Fonts',
    noun: 'font',
    empty: 'No fonts yet — pick from Google Fonts or upload a font file.',
    match: (a) => a.kind === 'font',
  },
  {
    id: 'links',
    label: 'Links',
    noun: 'link',
    empty: 'No links added.',
    match: (a) => a.kind === 'link',
  },
];

/** Catch-all at the very bottom: ONLY what the system could not place in any
 *  other section. Recognized uploads go to their own sections instead — a
 *  logo to Logos, a font file to Fonts, and a palette image's swatches to
 *  Colors (so the palette image itself stays out of here too). */
const BRAND_ASSETS_GROUP: Group = {
  id: 'assets',
  label: 'Brand Assets',
  noun: 'asset',
  empty: "Nothing here yet — uploads we can't place anywhere else land in your brand assets.",
  match: (a) =>
    (a.kind === 'image' &&
      !a.isLogo &&
      !a.logoSlot &&
      !a.generated &&
      a.aiPlacement !== 'colors') ||
    a.kind === 'pdf' ||
    a.kind === 'design' ||
    a.kind === 'zip' ||
    a.kind === 'file' ||
    a.kind === 'video' ||
    a.kind === 'audio',
};

const FONT_PREVIEW_TEXT = 'Build a brand people remember';

interface AssetRowProps {
  asset: OnboardingAsset;
  /** Overrides the row title — font families show the family, not the filename. */
  displayName?: string;
  /** Overrides the row subtitle (e.g. "4 weights · Light · Regular…"). */
  displaySub?: string;
  onRename(name: string): void;
  onRemove(): void;
  onMove(target: MoveTarget): void;
  onContextMenu?(e: React.MouseEvent<HTMLDivElement>): void;
}

type MoveTarget = 'logo' | 'image' | 'color' | 'color-replace' | 'document' | 'font';

function AssetRow({ asset, displayName, displaySub, onRename, onRemove, onMove, onContextMenu }: AssetRowProps) {
  const label = displayName ?? asset.name;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft.trim() && draft.trim() !== label) onRename(draft.trim());
    else setDraft(label);
  };

  const isUploading = asset.uploadStatus === 'uploading';

  return (
    <div
      className={`asset-row${isUploading ? ' is-uploading' : ''}${asset.kind === 'link' ? ' is-link' : ''}${asset.kind === 'color' ? ' is-color' : ''}`}
      onContextMenu={onContextMenu}
    >
      <div className="asset-thumb" aria-hidden="true">
        {asset.kind === 'color' && asset.value ? (
          <span className="asset-swatch" style={{ background: asset.value }} />
        ) : asset.kind === 'font' ? (
          <span
            className="asset-thumb-font"
            style={asset.fontSource === 'google' ? { fontFamily: `'${asset.name}', sans-serif` } : undefined}
          >
            Aa
          </span>
        ) : asset.kind === 'link' ? (
          <LinkFavicon url={asset.sourceUrl} fallback={getPlatform(asset.socialPlatform).icon} />
        ) : asset.previewUrl && asset.kind === 'image' ? (
          <img src={asset.previewUrl} alt="" />
        ) : (
          <span className="asset-thumb-icon">{kindGlyph(asset.kind)}</span>
        )}
        {isUploading && (
          <span className="asset-progress" style={{ ['--pct' as never]: `${Math.round(asset.uploadProgress * 100)}%` }} />
        )}
      </div>
      <div className="asset-meta">
        {editing ? (
          <input
            ref={inputRef}
            className="asset-name-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') {
                setDraft(label);
                setEditing(false);
              }
            }}
          />
        ) : (
          <button type="button" className="asset-name" onClick={() => setEditing(true)} title="Rename">
            {label}
          </button>
        )}
        <span
          className="asset-sub"
          data-suggested={(displaySub ?? asset.sub) === SUGGESTED_FONT_SUB ? 'true' : undefined}
        >
          {displaySub ?? asset.sub}
        </span>
      </div>
      <div className="asset-actions">
        <MoveMenu asset={asset} onMove={onMove} />
        <button type="button" className="asset-icon-btn" onClick={() => setEditing(true)} title="Rename" aria-label="Rename">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
        <button type="button" className="asset-icon-btn is-danger" onClick={onRemove} title="Remove" aria-label="Remove">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* Uploaded font files → one live FontFace family per uploaded family, with
 * every weight file registered under its parsed CSS weight — so the mini
 * type-specimen card renders real Light/Regular/Bold examples. */
const loadedFontAssetIds = new Set<string>();
async function ensureUploadedFontFamily(group: FontFamilyGroup): Promise<string | null> {
  if (typeof FontFace === 'undefined') return null;
  const cssName = `bos-upload-${group.key}`;
  let anyLoaded = false;
  await Promise.all(
    group.assets.map(async (asset, i) => {
      if (!asset._file) return;
      if (loadedFontAssetIds.has(asset.id)) {
        anyLoaded = true;
        return;
      }
      try {
        const buf = await asset._file.arrayBuffer();
        const parsed = group.weights[i];
        const face = new FontFace(cssName, buf, {
          weight: String(parsed?.rank ?? 400),
          style: /italic/i.test(parsed?.weight ?? '') ? 'italic' : 'normal',
        });
        await face.load();
        document.fonts.add(face);
        loadedFontAssetIds.add(asset.id);
        anyLoaded = true;
      } catch {
        /* corrupt file — skip this weight */
      }
    }),
  );
  return anyLoaded ? cssName : null;
}

const WEIGHT_EXAMPLE_TEXT = 'Professional standard';
const GOOGLE_WEIGHT_ROWS = [
  { label: 'Regular', rank: 400, italic: false },
  { label: 'Medium', rank: 500, italic: false },
  { label: 'Bold', rank: 700, italic: false },
];

/** One card per font family — a compact version of the Setup page's
 *  Typography specimen: family name set in the typeface + alphabet lines on
 *  the left, weight examples on the right. Google families load via the
 *  injected stylesheet; uploaded files become a real FontFace per weight. */
function FontFamilyRow({
  family,
  onRename,
  onMove,
  onRemove,
  onContextMenu,
}: {
  family: FontFamilyGroup;
  onRename(name: string): void;
  onMove(target: MoveTarget): void;
  onRemove(): void;
  onContextMenu?(e: React.MouseEvent<HTMLDivElement>): void;
}) {
  const isGoogle = family.lead.fontSource === 'google';
  const [uploadedCss, setUploadedCss] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(family.family);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isGoogle) {
      injectGoogleFont(family.family);
      return;
    }
    let alive = true;
    void ensureUploadedFontFamily(family).then((css) => {
      if (alive) setUploadedCss(css);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family.key, family.assets.length, isGoogle]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const fontFamilyCss = isGoogle
    ? `'${family.family}', sans-serif`
    : uploadedCss
    ? `'${uploadedCss}', sans-serif`
    : null;

  // Plain row fallback while the FontFace loads (or if the file is corrupt).
  if (!fontFamilyCss) {
    return (
      <AssetRow
        asset={family.lead}
        displayName={family.family}
        displaySub={
          // A typeface we proposed says so even when it has weights to describe,
          // because "not confirmed" is the more important fact about it.
          family.lead.sub === SUGGESTED_FONT_SUB
            ? SUGGESTED_FONT_SUB
            : family.assets.length > 1
              ? `${family.assets.length} weights · ${weightsSummary(family)}`
              : family.lead.sub
        }
        onRename={onRename}
        onMove={onMove}
        onRemove={onRemove}
        onContextMenu={onContextMenu}
      />
    );
  }

  // Weight rows: uploaded files use their parsed weights; Google families
  // preview the three weights the injected stylesheet ships (400/500/700).
  const weightRows = isGoogle
    ? GOOGLE_WEIGHT_ROWS
    : (() => {
        // Dedupe by label (not rank alone) — Regular and Italic share rank
        // 400 but are different rows. Italic rows sort after their weight.
        const seen = new Set<string>();
        const rows: Array<{ label: string; rank: number; italic: boolean }> = [];
        family.weights.forEach((w) => {
          const label = w.weight || 'Regular';
          if (seen.has(label)) return;
          seen.add(label);
          rows.push({ label, rank: w.rank, italic: /italic/i.test(label) });
        });
        return rows
          .sort((a, b) => a.rank - b.rank || Number(a.italic) - Number(b.italic))
          .slice(0, 6);
      })();

  const commit = () => {
    setEditing(false);
    if (draft.trim() && draft.trim() !== family.family) onRename(draft.trim());
    else setDraft(family.family);
  };

  return (
    <div className="asset-row font-card" onContextMenu={onContextMenu}>
      <div className="font-card-main">
        <div className="font-card-left">
          {editing ? (
            <input
              ref={inputRef}
              className="font-card-name-input"
              style={{ fontFamily: fontFamilyCss }}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit();
                if (e.key === 'Escape') {
                  setDraft(family.family);
                  setEditing(false);
                }
              }}
            />
          ) : (
            <button
              type="button"
              className="font-card-name"
              style={{ fontFamily: fontFamilyCss }}
              title="Rename"
              onClick={() => {
                setDraft(family.family);
                setEditing(true);
              }}
            >
              {family.family}
            </button>
          )}
          <span className="font-card-alpha" style={{ fontFamily: fontFamilyCss }}>
            abcdefghijklmnopqrstuvwxyz
          </span>
          <span className="font-card-alpha" style={{ fontFamily: fontFamilyCss }}>
            ABCDEFGHIJKLMNOPQRSTUVWXYZ
          </span>
          <span className="font-card-alpha" style={{ fontFamily: fontFamilyCss }}>
            0123456789
          </span>
          {/* No weight info here — the weights column already tells that
              story. Only the source (or file info) remains. */}
          {(isGoogle || family.assets.length === 1) && (
            <span className="font-card-sub">{isGoogle ? 'Google Fonts' : family.lead.sub}</span>
          )}
        </div>
        <div className="font-card-weights">
          {weightRows.map((w) => (
            <div key={w.label} className="font-card-weight-row">
              <span className="font-card-weight-label">{w.label}</span>
              <span
                className="font-card-weight-example"
                style={{
                  fontFamily: fontFamilyCss,
                  fontWeight: w.rank,
                  fontStyle: w.italic ? 'italic' : 'normal',
                }}
              >
                {WEIGHT_EXAMPLE_TEXT}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="asset-actions">
        <button
          type="button"
          className="asset-icon-btn"
          onClick={() => {
            setDraft(family.family);
            setEditing(true);
          }}
          title="Rename"
          aria-label="Rename"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
        <button type="button" className="asset-icon-btn is-danger" onClick={onRemove} title="Remove" aria-label="Remove">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/** Letter-mark badge for a link row — the site's first letter, rendered
 *  locally. No third-party favicon service: fetching the real favicon
 *  leaked every brand URL to Google. Falls back to the platform glyph
 *  for bad URLs. */
/**
 * The site's own icon, with the platform glyph behind it.
 *
 * A first letter says nothing — half the internet starts with the same one, and
 * it reads as a missing image rather than a brand. The favicon is what people
 * actually recognise, so it is tried first and the platform glyph is the
 * fallback for a host that has none (or that fails to load).
 */
function LinkFavicon({ url, fallback }: { url?: string; fallback: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  const host = useMemo(() => {
    if (!url) return null;
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return null;
    }
  }, [url]);

  if (!host || failed) {
    return <span className="asset-thumb-platform">{fallback}</span>;
  }
  return (
    <img
      className="asset-thumb-favicon"
      src={`https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(host)}`}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

interface MoveOption {
  target: MoveTarget;
  label: string;
  hint?: string;
}

function moveOptionsFor(asset: OnboardingAsset): MoveOption[] {
  const opts: MoveOption[] = [];
  const ext = (asset.name.match(/\.([a-zA-Z0-9]+)$/)?.[1] || '').toLowerCase();
  const imageExt = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif'].includes(ext);

  if (asset.kind === 'image') {
    if (asset.isLogo) {
      opts.push({ target: 'image', label: 'Move to images' });
    } else {
      opts.push({ target: 'logo', label: 'Mark as logo' });
    }
    opts.push({ target: 'color', label: 'Add main color', hint: 'Keep image' });
    opts.push({ target: 'color-replace', label: 'Replace with color' });
    opts.push({ target: 'document', label: 'Move to documents' });
  } else if (asset.kind === 'pdf' || asset.kind === 'zip' || asset.kind === 'design' || asset.kind === 'file') {
    if (imageExt) {
      opts.push({ target: 'image', label: 'Move to images' });
      opts.push({ target: 'logo', label: 'Mark as logo' });
    }
    opts.push({ target: 'document', label: 'Keep in documents' });
  } else if (asset.kind === 'font') {
    opts.push({ target: 'document', label: 'Move to documents' });
  }
  return opts;
}

function MoveMenu({ asset, onMove }: { asset: OnboardingAsset; onMove(target: MoveTarget): void }) {
  const [open, setOpen] = useState(false);
  const options = moveOptionsFor(asset);
  if (options.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="asset-icon-btn" title="Move to…" aria-label="Move to">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12h13" />
            <path d="m13 6 6 6-6 6" />
            <circle cx="20" cy="6" r="1.2" fill="currentColor" />
          </svg>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="asset-move-menu" style={{ width: 200, padding: 4 }}>
        {options.map((opt) => (
          <button
            key={opt.target}
            type="button"
            className="asset-move-item"
            onClick={() => {
              onMove(opt.target);
              setOpen(false);
            }}
          >
            <span>{opt.label}</span>
            {opt.hint && <span className="asset-move-hint">{opt.hint}</span>}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function kindGlyph(kind: AssetKind): string {
  switch (kind) {
    case 'image':
      return '🖼';
    case 'font':
      return 'Aa';
    case 'pdf':
      return 'PDF';
    case 'zip':
      return 'ZIP';
    case 'link':
      return '↗';
    case 'design':
      return '✦';
    case 'video':
      return '▶';
    case 'audio':
      return '♪';
    case 'color':
      return '●';
    default:
      return '·';
  }
}

export interface UploadsReviewPanelProps {
  /** Present once the brand exists — every write below targets it. */
  brandId?: string;
  /** The canonical brand, read into the shape this panel renders. */
  projection?: Projection | null;
  actor?: { kind: 'human'; userId: string };
  /** Called after a write lands, so the projection can be re-read. */
  onChanged?(): void;
}

export function UploadsReviewPanel({ brandId, projection, actor, onChanged }: UploadsReviewPanelProps = {}) {
  const assets = useV4Store((s) => s.assets);
  const define = useV4Store((s) => s.define);
  const updateDefine = useV4Store((s) => s.updateDefine);
  const aboutSections = useV4Store((s) => s.aboutSections);
  const addAsset = useV4Store((s) => s.addAsset);
  const updateAssetProgress = useV4Store((s) => s.updateAssetProgress);
  const markAssetDone = useV4Store((s) => s.markAssetDone);
  const removeAsset = useV4Store((s) => s.removeAsset);
  const renameAsset = useV4Store((s) => s.renameAsset);
  const updateAsset = useV4Store((s) => s.updateAsset);

  const deps = useMemo(
    () => ({
      max: MAX_ASSETS,
      getCount: () => useV4Store.getState().assets.length,
      getAssets: () => useV4Store.getState().assets,
      addAsset,
      updateAssetProgress,
      markAssetDone,
    }),
    [addAsset, updateAssetProgress, markAssetDone]
  );

  const queueFile = useCallback((file: File) => enqueueFile(file, deps), [deps]);

  const handleMove = useCallback(
    async (id: string, target: MoveTarget) => {
      const asset = useV4Store.getState().assets.find((a) => a.id === id);
      if (!asset) return;
      switch (target) {
        case 'logo':
          updateAsset(id, { kind: 'image', isLogo: true });
          break;
        case 'image':
          updateAsset(id, { kind: 'image', isLogo: false });
          break;
        case 'document':
          updateAsset(id, { kind: 'file', isLogo: false });
          break;
        case 'font':
          updateAsset(id, { kind: 'font', isLogo: false });
          break;
        case 'color':
        case 'color-replace': {
          if (!asset.previewUrl) return;
          const colors = await extractDominantColors(asset.previewUrl, 1);
          if (colors.length > 0) {
            const exists = useV4Store.getState().assets.some((a) => a.kind === 'color' && a.value === colors[0]);
            if (!exists) {
              addAsset({
                id: genId(),
                name: colors[0],
                sub: 'From image',
                kind: 'color',
                value: colors[0],
                previewUrl: null,
                uploadStatus: 'done',
                uploadProgress: 1,
              });
            }
          }
          if (target === 'color-replace') removeAsset(id);
          break;
        }
      }
    },
    [updateAsset, addAsset, removeAsset]
  );

  const addColor = useCallback(
    (rawHex: string, source: 'manual' | 'extracted' = 'manual') => {
      const hex = normalizeHex(rawHex);
      if (!hex) return false;
      const existing = useV4Store.getState().assets.filter((a) => a.kind === 'color' && a.value);
      if (existing.some((a) => a.value === hex)) return false;
      // A manual pick is the user's; it replaces the last extracted swatch
      // rather than being refused at the cap.
      if (existing.length >= MAX_COLORS) {
        if (source === 'extracted') return false;
        const last = existing[existing.length - 1];
        if (last) removeAsset(last.id);
      }
      // Extraction from two sources (logo + palette image) can yield the same
      // brand color a few RGB points apart — collapse those instead of
      // stacking near-identical swatches. Manual picks are always honored.
      if (source === 'extracted') {
        const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
        const near = existing.some((a) => {
          const v = (a.value ?? '').replace('#', '');
          if (v.length !== 6) return false;
          const dr = parseInt(v.slice(0, 2), 16) - r;
          const dg = parseInt(v.slice(2, 4), 16) - g;
          const db = parseInt(v.slice(4, 6), 16) - b;
          return dr * dr + dg * dg + db * db <= 24 * 24;
        });
        if (near) return false;
      }
      const asset: OnboardingAsset = {
        id: genId(),
        name: hex,
        sub: source === 'extracted' ? 'Extracted' : 'Color',
        kind: 'color',
        value: hex,
        previewUrl: null,
        uploadStatus: 'done',
        uploadProgress: 1,
      };
      addAsset(asset);
      return true;
    },
    [addAsset, removeAsset]
  );

  const addLink = useCallback(
    (rawInput: string, preferredPlatformId?: string) => {
      const input = rawInput.trim();
      if (!input) return false;
      const det = detectPlatform(input);
      const platform =
        preferredPlatformId && det.platform.id === 'website'
          ? SOCIAL_PLATFORMS.find((p) => p.id === preferredPlatformId) ?? det.platform
          : det.platform;
      const url = det.url || (platform.fromHandle?.(input) ?? '');
      if (!url) return false;
      const exists = useV4Store.getState().assets.some((a) => a.kind === 'link' && a.sourceUrl === url);
      if (exists) return false;
      const handle = det.handle ?? input.replace(/^https?:\/\//i, '');
      const asset: OnboardingAsset = {
        id: genId(),
        name: handle,
        sub: platform.name,
        kind: 'link',
        sourceUrl: url,
        socialPlatform: platform.id,
        handle,
        previewUrl: null,
        uploadStatus: 'done',
        uploadProgress: 1,
      };
      addAsset(asset);
      return true;
    },
    [addAsset]
  );

  const addGoogleFont = useCallback(
    (family: string) => {
      const exists = useV4Store
        .getState()
        .assets.some((a) => a.kind === 'font' && a.fontSource === 'google' && a.name === family);
      if (exists) return false;
      const asset: OnboardingAsset = {
        id: genId(),
        name: family,
        sub: 'Google Fonts',
        kind: 'font',
        fontSource: 'google',
        previewUrl: null,
        uploadStatus: 'done',
        uploadProgress: 1,
      };
      addAsset(asset);
      // Inject Google Fonts stylesheet so the preview renders in that family.
      injectGoogleFont(family);
      return true;
    },
    [addAsset]
  );

  // "Name — Slogan" bar at the very top. The slogan comes from the parsed
  // description (a custom "Slogan/Tagline" About section, or an explicit
  // label in the raw text). No slogan → the bar shows the name alone.
  const brandName = define.name.trim();
  const parsedSlogan = useMemo(() => {
    const sec = aboutSections.find((s) => /^(?:brand\s+)?(?:slogan|tagline|motto)s?$/i.test(s.name.trim()));
    const fromSection = sec?.content.trim().split(/\r?\n/)[0]?.replace(/^["'“”‘’*_\s]+|["'“”‘’*_\s]+$/g, '').trim();
    if (fromSection && fromSection.length <= 80) return fromSection;
    return extractSlogan(define.description);
  }, [aboutSections, define.description]);
  // A slogan the user typed inline wins; clearing it falls back to the parse.
  const slogan = define.slogan?.trim() ? define.slogan.trim() : parsedSlogan;
  // Set when a brand-bar tag is clicked, so the matching About card opens.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [editingName]);
  const commitName = () => {
    setEditingName(false);
    const next = nameDraft.trim();
    if (!next || next === brandName) return;
    updateDefine({ name: next });
    if (brandId) void renameBrand(brandId, next).then(() => onChanged?.());
  };

  const [editingSlogan, setEditingSlogan] = useState(false);
  const [sloganDraft, setSloganDraft] = useState('');
  const sloganInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editingSlogan) {
      sloganInputRef.current?.focus();
      sloganInputRef.current?.select();
    }
  }, [editingSlogan]);
  const commitSlogan = () => {
    setEditingSlogan(false);
    const next = sloganDraft.trim();
    updateDefine({ slogan: next });
    // A business fact: it saves on edit and there is nothing to confirm.
    if (brandId) void saveBusinessFact(brandId, { tagline: next }).then(() => onChanged?.());
  };

  // Palettes / font pairings to offer when the user uploaded none — ranked
  // by the industry/style keywords found in what they told us about the brand.
  const brandText = useMemo(
    () => [define.name, define.description, ...aboutSections.map((s) => `${s.name} ${s.content}`)].join('\n'),
    [define.name, define.description, aboutSections],
  );
  const paletteSuggestions = useMemo(() => suggestPalettesFor(brandText), [brandText]);
  const fontSuggestions = useMemo(() => suggestFontsFor(brandText), [brandText]);

  /**
   * The canonical brand, pushed into the store this panel renders from.
   *
   * A PROJECTION, not a second source of truth: the brand decided these values
   * (from the brief, from the uploads, by source priority), and this only makes
   * them visible in the controls that already exist. Every edit below writes
   * straight back, so the store never becomes the authority.
   */
  const projectedRef = useRef<string>('');
  useEffect(() => {
    if (!projection) return;
    const key = JSON.stringify(projection);
    if (projectedRef.current === key) return;
    projectedRef.current = key;
    const store = useV4Store.getState();

    // Colours — replace, so a value the user changed upstream cannot linger.
    for (const c of store.assets.filter((a) => a.kind === 'color')) store.removeAsset(c.id);
    projection.colors.forEach((c, i) => {
      const id = genId();
      store.addAsset({
        id,
        name: c.hex,
        sub: i === 0 ? 'Primary' : 'Brand color',
        kind: 'color',
        value: c.hex,
        previewUrl: null,
        uploadStatus: 'done',
        uploadProgress: 1,
      });
      if (c.primary) store.setPrimaryColor(id);
    });

    // Typefaces the brand already knows about.
    const known = new Set(store.assets.filter((a) => a.kind === 'font').map((a) => a.name));
    for (const { family, origin } of projection.fonts) {
      if (known.has(family)) continue;
      store.addAsset({
        id: genId(),
        name: family,
        // Whose choice it was is the most important thing about it.
        sub: ORIGIN_LABEL[origin],
        kind: 'font',
        fontSource: 'google',
        previewUrl: null,
        uploadStatus: 'done',
        uploadProgress: 1,
      });
      known.add(family);
    }

    // Nothing to show is worse than a starting point. When the brand brought no
    // typeface, put the best-matching PAIRING up — and label it plainly as ours
    // rather than theirs, because it is not confirmed and must not look it. The
    // user either confirms it below or picks another.
    if (known.size === 0) {
      const suggestion = suggestFontsFor(brandText)[0];
      if (suggestion) {
        for (const family of [suggestion.heading, suggestion.body]) {
          if (known.has(family)) continue;
          known.add(family);
          store.addAsset({
            id: genId(),
            name: family,
            sub: SUGGESTED_FONT_SUB,
            kind: 'font',
            fontSource: 'google',
            previewUrl: null,
            uploadStatus: 'done',
            uploadProgress: 1,
          });
          injectGoogleFont(family);
        }
      }
    }

    // Logo placements the classifier could evidence, and the exact duplicates
    // it dropped. A role with no evidence stays empty rather than guessed into.
    // Duplicates go FIRST: the board's router places any logo it can see, so a
    // copy still in the store would be handed a slot before it is removed.
    for (const id of projection.duplicateIds) store.removeAsset(id);
    for (const { assetId, slot } of projection.logoSlots) {
      // A role the user has confirmed is theirs. This effect re-runs on every
      // projection — i.e. after every edit anywhere on the review — so without
      // this guard the classifier would quietly put its own answer back over
      // the one the owner just gave it.
      const placed = useV4Store.getState().assets.find((a) => a.id === assetId);
      if (placed?.slotConfirmed) continue;
      store.updateAsset(assetId, { kind: 'image', isLogo: true, logoSlot: slot as LogoSlot });
    }

    if (projection.slogan) store.updateDefine({ slogan: projection.slogan });
  }, [projection, brandText]);

  // Auto-extract colors once when the panel opens (only if there are no color assets yet).
  const extractedRef = useRef(false);
  useEffect(() => {
    if (extractedRef.current) return;
    const images = assets.filter((a) => a.kind === 'image' && a.previewUrl);
    if (images.length === 0) return;
    const hasColors = assets.some((a) => a.kind === 'color');
    if (hasColors) {
      extractedRef.current = true;
      return;
    }
    extractedRef.current = true;
    (async () => {
      for (const img of images.slice(0, 2)) {
        if (!img.previewUrl) continue;
        const colors = await extractDominantColors(img.previewUrl, 4);
        for (const c of colors) addColor(c, 'extracted');
      }
    })();
  }, [assets, addColor]);

  return (
    <section className="panel is-active uploads-review">
      <header className="review-head">
        <h2>Review your uploads</h2>
        <p className="subtitle">Drop your logos in their slots, refine the system, then write what your brand is about.</p>
      </header>

      <div className="review-groups">
        {brandName && (
          <div className="review-brandbar">
            {editingName ? (
              <input
                ref={nameInputRef}
                type="text"
                className="review-brandbar-name-input"
                value={nameDraft}
                maxLength={60}
                aria-label="Brand name"
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitName();
                  if (e.key === 'Escape') setEditingName(false);
                }}
              />
            ) : (
              <button
                type="button"
                className="review-brandbar-name"
                title="Edit name"
                onClick={() => {
                  setNameDraft(brandName);
                  setEditingName(true);
                }}
              >
                {brandName}
              </button>
            )}
            <span className="review-brandbar-sep" aria-hidden="true">–</span>
            {editingSlogan ? (
              <input
                ref={sloganInputRef}
                type="text"
                className="review-brandbar-slogan-input"
                placeholder="your brand slogan"
                value={sloganDraft}
                maxLength={80}
                onChange={(e) => setSloganDraft(e.target.value)}
                onBlur={commitSlogan}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitSlogan();
                  if (e.key === 'Escape') setEditingSlogan(false);
                }}
              />
            ) : (
              <button
                type="button"
                className={`review-brandbar-slogan${slogan ? '' : ' is-placeholder'}`}
                title="Edit slogan"
                onClick={() => {
                  setSloganDraft(slogan ?? '');
                  setEditingSlogan(true);
                }}
              >
                {slogan ?? 'your brand slogan'}
              </button>
            )}
            {Boolean(projection?.industryLabel || projection?.styleLabels.length) && (
              <span className="review-brandbar-meta">
                {/* Clicking a tag opens the value it summarises — the summary and
                    the control are the same thing, so it should behave like one. */}
                {projection.industryLabel && (
                  <button type="button" className="review-tag" onClick={() => setOpenPath('industry')}>
                    {projection.industryLabel}
                  </button>
                )}
                {projection.styleLabels.length > 0 && (
                  <button
                    type="button"
                    className="review-tag"
                    onClick={() => setOpenPath('visualStyle.descriptors')}
                  >
                    {projection.styleLabels.join(' · ')}
                  </button>
                )}
              </span>
            )}
          </div>
        )}

        <article className="review-group review-group-logos">
          <header className="review-group-head">
            <h3>Logos</h3>
            <span className="review-group-count">
              {(() => {
                // What the USER brought. The black/white variants this flow
                // derives from an upload are shown on the board but never
                // counted as logos the user supplied — counting them made
                // three uploads read as five.
                const n = assets.filter(
                  (a) => a.kind === 'image' && a.isLogo && !a.generated,
                ).length;
                return `${n} ${n === 1 ? 'logo' : 'logos'}`;
              })()}
            </span>
          </header>
          <LogoSlots assets={assets} />
        </article>

        <ColorsBoard
          colors={assets.filter((a) => a.kind === 'color')}
          suggestions={paletteSuggestions}
          onToggleLock={(id) => {
            const target = useV4Store.getState().assets.find((a) => a.id === id);
            if (target) updateAsset(id, { locked: !target.locked });
          }}
          onAdd={(hex) => addColor(hex, 'manual')}
          onUpdate={(id, hex) => {
            const exists = useV4Store
              .getState()
              .assets.some((a) => a.kind === 'color' && a.value === hex && a.id !== id);
            if (exists) return;
            updateAsset(id, { value: hex, name: hex });
          }}
          onRemove={removeAsset}
          onExtract={async () => {
            const images = assets.filter((a) => a.kind === 'image' && a.previewUrl);
            if (images.length === 0) return;
            for (const img of images.slice(0, 3)) {
              if (!img.previewUrl) continue;
              const colors = await extractDominantColors(img.previewUrl, 4);
              for (const c of colors) addColor(c, 'extracted');
            }
          }}
          onExtractFromFile={async (file) => {
            // Dedicated "Extract from image" flow — pulls dominant colors
            // from a one-off uploaded image without adding it as a regular
            // brand asset, so the image only contributes its palette.
            const url = URL.createObjectURL(file);
            try {
              const palette = await extractDominantColors(url, 5);
              for (const c of palette) addColor(c, 'extracted');
            } finally {
              URL.revokeObjectURL(url);
            }
          }}
        />

        {GROUPS.map((group) => {
          const items = assets.filter(group.match);
          return (
            <GroupCard
              key={group.id}
              group={group}
              items={items}
              fontSuggestions={group.id === 'fonts' ? fontSuggestions : undefined}
              onUploadFile={queueFile}
              onAddColor={(hex) => addColor(hex, 'manual')}
              onAddGoogleFont={addGoogleFont}
              onAddLink={addLink}
              onExtractColors={async () => {
                const images = assets.filter((a) => a.kind === 'image' && a.previewUrl);
                if (images.length === 0) return;
                for (const img of images.slice(0, 3)) {
                  if (!img.previewUrl) continue;
                  const colors = await extractDominantColors(img.previewUrl, 4);
                  for (const c of colors) addColor(c, 'extracted');
                }
              }}
              onRename={renameAsset}
              onMove={handleMove}
              onRemove={removeAsset}
            />
          );
        })}

        <AboutGroup
          brandId={brandId}
          projection={projection}
          actor={actor}
          onChanged={onChanged}
          openPath={openPath}
          onOpenPathHandled={() => setOpenPath(null)}
        />

        <GroupCard
          group={BRAND_ASSETS_GROUP}
          items={assets.filter(BRAND_ASSETS_GROUP.match)}
          onUploadFile={queueFile}
          onAddColor={(hex) => addColor(hex, 'manual')}
          onAddGoogleFont={addGoogleFont}
          onAddLink={addLink}
          onExtractColors={() => {}}
          onRename={renameAsset}
          onMove={handleMove}
          onRemove={removeAsset}
        />
      </div>
    </section>
  );
}

interface GroupCardProps {
  group: Group;
  items: OnboardingAsset[];
  /** Font pairings to offer while the fonts group is empty. */
  fontSuggestions?: SuggestedFontPairing[];
  onUploadFile(file: File): void;
  onAddColor(hex: string): boolean;
  onAddGoogleFont(family: string): boolean;
  onAddLink(rawInput: string, preferredPlatformId?: string): boolean;
  onExtractColors(): void;
  onRename(id: string, name: string): void;
  onMove(id: string, target: MoveTarget): void;
  onRemove(id: string): void;
}

function GroupCard({ group, items, fontSuggestions, onUploadFile, onAddColor, onAddGoogleFont, onAddLink, onExtractColors, onRename, onMove, onRemove }: GroupCardProps) {
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);
  const ctxAnchorRef = useRef<HTMLElement | null>(null);
  // Eight uploaded files are usually two fonts — collapse weights into families.
  const fontFamilies = useMemo(
    () => (group.id === 'fonts' ? groupFontAssets(items) : []),
    [group.id, items],
  );

  const closeCtxMenu = useCallback(() => {
    ctxAnchorRef.current?.classList.remove('is-ctx-active');
    ctxAnchorRef.current = null;
    setCtxMenu(null);
  }, []);

  /** Right-click on a font family — four actions only: copy name, rename,
   *  move, remove. Per-weight rows live in the row subtitle, not the menu. */
  const openFontFamilyMenu = (e: React.MouseEvent<HTMLDivElement>, family: FontFamilyGroup) => {
    e.preventDefault();
    e.stopPropagation();
    ctxAnchorRef.current?.classList.remove('is-ctx-active');
    ctxAnchorRef.current = e.currentTarget;
    e.currentTarget.classList.add('is-ctx-active');

    const items: ContextMenuState['items'] = [
      {
        label: 'Copy font name',
        onSelect: () => {
          void copyToClipboard(family.family);
        },
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
          </svg>
        ),
      },
      {
        label: 'Rename',
        onSelect: () => {
          const next = window.prompt('Rename font', family.family);
          if (next && next.trim()) onRename(family.lead.id, next.trim());
        },
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        ),
      },
      {
        label: 'Move to documents',
        onSelect: () => family.assets.forEach((a) => onMove(a.id, 'document')),
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12h13" />
            <path d="m13 6 6 6-6 6" />
          </svg>
        ),
      },
      {
        label: 'Remove font',
        destructive: true,
        onSelect: () => family.assets.forEach((a) => onRemove(a.id)),
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M5 6v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6" />
          </svg>
        ),
      },
    ];
    setCtxMenu({ x: e.clientX, y: e.clientY, items });
  };

  const openAssetMenu = (e: React.MouseEvent<HTMLDivElement>, asset: OnboardingAsset) => {
    e.preventDefault();
    e.stopPropagation();
    ctxAnchorRef.current?.classList.remove('is-ctx-active');
    ctxAnchorRef.current = e.currentTarget;
    e.currentTarget.classList.add('is-ctx-active');

    const items: ContextMenuState['items'] = [];
    items.push({
      label: 'Copy name',
      onSelect: () => {
        void copyToClipboard(asset.name);
      },
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15V5a2 2 0 0 1 2-2h10" />
        </svg>
      ),
    });
    if (asset.kind === 'link' && asset.sourceUrl) {
      items.push({
        label: 'Copy URL',
        onSelect: () => {
          void copyToClipboard(asset.sourceUrl!);
        },
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
            <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
          </svg>
        ),
      });
      items.push({
        label: 'Open in new tab',
        onSelect: () => {
          window.open(asset.sourceUrl!, '_blank', 'noopener,noreferrer');
        },
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        ),
      });
    }
    items.push({
      label: 'Rename',
      onSelect: () => {
        const next = window.prompt('Rename', asset.name);
        if (next && next.trim()) onRename(asset.id, next.trim());
      },
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      ),
    });
    items.push({
      label: `Remove ${group.label.toLowerCase().replace(/s$/, '')}`,
      destructive: true,
      onSelect: () => onRemove(asset.id),
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M5 6v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6" />
        </svg>
      ),
    });
    setCtxMenu({ x: e.clientX, y: e.clientY, items });
  };

  return (
    <article className="review-group">
      <header className="review-group-head">
        <h3>{group.label}</h3>
        {group.id === 'fonts' && items.length === 0 && fontSuggestions?.length ? (
          <SuggestedFontsButton
            suggestions={fontSuggestions}
            onPickPairing={(pairing) => {
              onAddGoogleFont(pairing.heading);
              if (pairing.body !== pairing.heading) onAddGoogleFont(pairing.body);
            }}
          />
        ) : (
          <span className="review-group-count">
            {group.id === 'fonts'
              ? `${fontFamilies.length} ${fontFamilies.length === 1 ? 'font' : 'fonts'}`
              : `${items.length} ${items.length === 1 ? group.noun : `${group.noun}s`}`}
          </span>
        )}
      </header>
      {items.length === 0 ? (
        <p className="review-group-empty">{group.empty}</p>
      ) : group.id === 'fonts' ? (
        <div className="review-group-list">
          {fontFamilies.map((family) => (
            <FontFamilyRow
              key={family.key}
              family={family}
              onRename={(name) => onRename(family.lead.id, name)}
              onMove={(target) => family.assets.forEach((a) => onMove(a.id, target))}
              onRemove={() => family.assets.forEach((a) => onRemove(a.id))}
              onContextMenu={(e) => openFontFamilyMenu(e, family)}
            />
          ))}
        </div>
      ) : (
        <div className="review-group-list">
          {items.map((asset) => (
            <AssetRow
              key={asset.id}
              asset={asset}
              onRename={(name) => onRename(asset.id, name)}
              onMove={(target) => onMove(asset.id, target)}
              onRemove={() => onRemove(asset.id)}
              onContextMenu={(e) => openAssetMenu(e, asset)}
            />
          ))}
        </div>
      )}
      <GroupFooter
        group={group}
        onUploadFile={onUploadFile}
        onAddColor={onAddColor}
        onAddGoogleFont={onAddGoogleFont}
        onAddLink={onAddLink}
        onExtractColors={onExtractColors}
      />
      {ctxMenu && (
        <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} onClose={closeCtxMenu} />
      )}
    </article>
  );
}

interface GroupFooterProps {
  group: Group;
  onUploadFile(file: File): void;
  onAddColor(hex: string): boolean;
  onAddGoogleFont(family: string): boolean;
  onAddLink(rawInput: string, preferredPlatformId?: string): boolean;
  onExtractColors(): void;
}

function GroupFooter({ group, onUploadFile, onAddGoogleFont, onAddLink }: GroupFooterProps) {
  if (group.id === 'fonts') {
    return <FontsFooter onUpload={onUploadFile} onPick={onAddGoogleFont} />;
  }
  if (group.id === 'links') {
    return <LinksFooter onAdd={onAddLink} />;
  }
  const accept = ACCEPT[group.id];
  if (!accept) return null;
  return <FileUploadFooter accept={accept} label={`Add ${group.label.toLowerCase().replace(/s$/, '')}`} onPick={onUploadFile} />;
}

const ACCEPT: Record<string, string> = {
  logos: 'image/*,.svg',
  images: 'image/*',
  documents: '.pdf,.zip,.ai,.sketch,.fig,.psd',
  assets: 'image/*,.svg,.pdf,.zip,.ai,.sketch,.fig,.psd',
};

function FileUploadFooter({ accept, label, onPick }: { accept: string; label: string; onPick(f: File): void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="review-group-foot">
      <button
        type="button"
        className="add-more-btn"
        onClick={() => ref.current?.click()}
      >
        <span className="add-more-plus" aria-hidden="true">+</span>
        {label}
      </button>
      <input
        ref={ref}
        type="file"
        multiple
        hidden
        accept={accept}
        onChange={(e) => {
          if (e.target.files) for (let i = 0; i < e.target.files.length; i++) onPick(e.target.files[i]);
          e.target.value = '';
        }}
      />
    </div>
  );
}

function isLightHex(hex: string): boolean {
  const clean = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return l > 0.6;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  } catch {
    return false;
  }
}

interface CopyFlash { id: number; text: string; x: number; y: number }

interface SwatchProps {
  hex: string;
  renderedHex: string;
  isActive: boolean;
  isPrimary: boolean;
  isLocked: boolean;
  zIndex: number;
  onPickerToggle(): void;
  /** Copy `text` to the clipboard and flash near `anchor` — the name copies
   *  the color's name, the hex copies the code. */
  onCopy(text: string, anchor: HTMLElement): void;
  onSetPrimary(): void;
  onToggleLock(): void;
  onDelete(): void;
  onContextMenu?(e: React.MouseEvent<HTMLButtonElement>): void;
  buttonRef?: (el: HTMLButtonElement | null) => void;
}

/** Onboarding-v4 colors swatch — mirrors the Setup page's Swatch markup so the
 *  shared `[data-workspace] .swatch` styles apply identically (same
 *  hover wave, same name/hex copy affordance, same active picker state). */
function Swatch({ hex, renderedHex, isActive, isPrimary, isLocked, zIndex, onPickerToggle, onCopy, onSetPrimary, onToggleLock, onDelete, onContextMenu, buttonRef }: SwatchProps) {
  const nameIconRef = useRef<OrganicIconHandle>(null);
  const hexIconRef = useRef<OrganicIconHandle>(null);
  const resetTimerRef = useRef<number | null>(null);
  const light = isLightHex(renderedHex);
  const makeCopyHandler =
    (text: () => string, iconRef: React.RefObject<OrganicIconHandle>) =>
    (e: React.MouseEvent<HTMLElement>) => {
      e.stopPropagation();
      onCopy(text(), e.currentTarget);
      iconRef.current?.startAnimation();
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = window.setTimeout(() => {
        iconRef.current?.stopAnimation();
        resetTimerRef.current = null;
      }, 520);
    };
  useEffect(
    () => () => {
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    },
    [],
  );
  // Live-follows the previewed color while the picker is being dragged.
  const displayName = hexToName(renderedHex);
  const handleCopyName = makeCopyHandler(() => displayName, nameIconRef);
  const handleCopyHex = makeCopyHandler(() => renderedHex.toUpperCase(), hexIconRef);
  return (
    <button
      ref={buttonRef}
      type="button"
      className={`swatch${light ? ' is-light' : ''}${isActive ? ' is-active' : ''}${isPrimary ? ' is-primary' : ''}`}
      style={{ background: renderedHex, zIndex }}
      aria-label={`Edit ${displayName} ${renderedHex}`}
      aria-expanded={isActive}
      onClick={(e) => {
        e.stopPropagation();
        onPickerToggle();
      }}
      onContextMenu={onContextMenu}
    >
      {/* Nested span (not a button) — a <button> inside a <button> is invalid
          HTML; same pattern the copy affordance below already uses. */}
      <span
        className={`swatch-primary-tag${isPrimary ? ' is-on' : ''}`}
        role="button"
        tabIndex={-1}
        aria-pressed={isPrimary}
        title={isPrimary ? 'Primary brand color — click to unset' : 'Set as the primary brand color'}
        onClick={(e) => {
          e.stopPropagation();
          onSetPrimary();
        }}
      >
        <span className="swatch-primary-dot" aria-hidden="true" />
        {isPrimary ? 'Primary' : 'Set primary'}
      </span>
      <span
        className="swatch-name"
        role="button"
        tabIndex={-1}
        title="Copy color name"
        onClick={handleCopyName}
      >
        {displayName}
        <span className="swatch-copy-icon" aria-hidden onClick={handleCopyName}>
          <CopyIcon ref={nameIconRef} size={13} />
        </span>
      </span>
      <span
        className="swatch-hex"
        role="button"
        tabIndex={-1}
        title="Click to copy hex code"
        onClick={handleCopyHex}
      >
        {renderedHex.toUpperCase()}
      </span>
      <span
        className={`swatch-lock${isLocked ? ' is-on' : ''}`}
        role="button"
        tabIndex={-1}
        title={isLocked ? 'Unlocked colors change on shuffle — click to unlock' : 'Lock this color so shuffle keeps it'}
        aria-label={isLocked ? `Unlock ${displayName}` : `Lock ${displayName}`}
        aria-pressed={isLocked}
        onClick={(e) => {
          e.stopPropagation();
          onToggleLock();
        }}
      >
        {isLocked ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 7.7-1.5" />
          </svg>
        )}
      </span>
      <span
        className="swatch-del"
        role="button"
        tabIndex={-1}
        title="Remove color"
        aria-label={`Remove ${displayName}`}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 6h18" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M5 6v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6" />
        </svg>
      </span>
    </button>
  );
}

interface ColorsBoardProps {
  colors: OnboardingAsset[];
  /** Palettes matched from the brand description — offered when no colors exist. */
  suggestions: SuggestedPalette[];
  onToggleLock(id: string): void;
  onAdd(hex: string): boolean;
  onUpdate(id: string, hex: string): void;
  onRemove(id: string): void;
  onExtract(): void;
  onExtractFromFile(file: File): Promise<void>;
}


/** Drop-in colors panel for the onboarding review step — same markup the
 *  Setup page renders (`.colors-row`, `.swatch`, `.cp-expand`) so the shared
 *  workspace.css styles cover hover wave, copy affordance, picker
 *  expansion, etc. without redefinition. The wrapping `data-workspace`
 *  div is what brings those styles into scope inside the onboarding shell. */
function ColorsBoard({ colors, suggestions, onToggleLock, onAdd, onUpdate, onRemove, onExtract, onExtractFromFile }: ColorsBoardProps) {
  const [theme] = useCosmosTheme();
  // Untagged palettes fall back to "first swatch is primary" — the same rule
  // brand creation uses — so the badge never shows an empty state.
  const primaryColorId = useV4Store((s) => s.primaryColorId);
  const setPrimaryColor = useV4Store((s) => s.setPrimaryColor);
  // The primary swatch always renders FIRST (leftmost) — same rule as the
  // Setup page. Everything below works off this ordered view.
  const orderedColors = useMemo(() => {
    if (!primaryColorId) return colors;
    const idx = colors.findIndex((c) => c.id === primaryColorId);
    if (idx <= 0) return colors;
    return [colors[idx], ...colors.slice(0, idx), ...colors.slice(idx + 1)];
  }, [colors, primaryColorId]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [previewHex, setPreviewHex] = useState<string | null>(null);
  const [addMode, setAddMode] = useState(false);
  const [addDraft, setAddDraft] = useState('#5B6BFF');
  const [flash, setFlash] = useState<CopyFlash | null>(null);
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);
  const [extractingFromFile, setExtractingFromFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const flashTimerRef = useRef<number | null>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const swatchRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());
  // Element the context menu was triggered from. While the menu is open the
  // anchor gets `is-ctx-active` so the swatch keeps its lifted+rotated pose,
  // matching the Setup page's behavior.
  const ctxAnchorRef = useRef<HTMLElement | null>(null);

  const closeCtxMenu = useCallback(() => {
    ctxAnchorRef.current?.classList.remove('is-ctx-active');
    ctxAnchorRef.current = null;
    setCtxMenu(null);
  }, []);

  // Outside-click + Escape collapse the picker / cancel add. Mirrors the
  // ColorsGroup behavior on the Setup page so the two feel identical.
  useEffect(() => {
    if (activeIndex == null && !addMode) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      if (groupRef.current?.contains(target)) return;
      setActiveIndex(null);
      setPreviewHex(null);
      setAddMode(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveIndex(null);
        setPreviewHex(null);
        setAddMode(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [activeIndex, addMode]);

  useEffect(
    () => () => {
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    },
    [],
  );

  const handleCopy = useCallback(async (text: string, anchor: HTMLElement) => {
    const ok = await copyToClipboard(text);
    if (!ok) return;
    const rect = anchor.getBoundingClientRect();
    const id = Date.now() + Math.random();
    setFlash({ id, text: 'Copied!', x: rect.left + rect.width / 2, y: rect.top });
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => setFlash(null), 1200);
  }, []);

  /** Drop keyboard focus after a picker interaction ends — a swatch left
   *  with :focus-visible stays raised (with its texts shown) until the user
   *  clicks somewhere else, which reads as a stuck hover. */
  const settleFocus = () => {
    const el = document.activeElement;
    if (el instanceof HTMLElement && groupRef.current?.contains(el)) el.blur();
  };

  const handleSwatchClick = (i: number) => {
    setAddMode(false);
    setActiveIndex((prev) => {
      if (prev === i) {
        setPreviewHex(null);
        settleFocus();
        return null;
      }
      setPreviewHex(null);
      return i;
    });
  };

  const openColorMenu = (
    e: React.MouseEvent<HTMLButtonElement>,
    color: OnboardingAsset,
    _index: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    // Mark the swatch so it stays raised while the menu is open.
    ctxAnchorRef.current?.classList.remove('is-ctx-active');
    ctxAnchorRef.current = e.currentTarget;
    e.currentTarget.classList.add('is-ctx-active');

    const hex = (color.value ?? '').toUpperCase();
    const displayName = hexToName(color.value ?? '#000000');
    const anchor = e.currentTarget;
    const flashCopy = (text: string) => {
      void (async () => {
        const ok = await copyToClipboard(text);
        if (!ok) return;
        const rect = anchor.getBoundingClientRect();
        const id = Date.now() + Math.random();
        setFlash({ id, text: 'Copied!', x: rect.left + rect.width / 2, y: rect.top });
        if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
        flashTimerRef.current = window.setTimeout(() => setFlash(null), 1200);
      })();
    };
    const isPrimary = primaryColorId ? primaryColorId === color.id : orderedColors[0]?.id === color.id;
    const items: ContextMenuState['items'] = [
      {
        label: isPrimary ? 'Unset as primary' : 'Set as primary color',
        onSelect: () => setPrimaryColor(color.id),
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
          </svg>
        ),
      },
      {
        label: 'Copy hex',
        onSelect: () => flashCopy(hex),
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="9" x2="20" y2="9" />
            <line x1="4" y1="15" x2="20" y2="15" />
            <line x1="10" y1="3" x2="8" y2="21" />
            <line x1="16" y1="3" x2="14" y2="21" />
          </svg>
        ),
      },
      {
        label: 'Copy name',
        onSelect: () => flashCopy(displayName),
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7V5h16v2" />
            <path d="M9 20h6" />
            <path d="M12 5v15" />
          </svg>
        ),
      },
      {
        label: 'Delete color',
        destructive: true,
        onSelect: () => {
          onRemove(color.id);
          if (activeIndex != null && orderedColors[activeIndex]?.id === color.id) {
            setActiveIndex(null);
            setPreviewHex(null);
          }
        },
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M5 6v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6" />
          </svg>
        ),
      },
    ];
    setCtxMenu({ x: e.clientX, y: e.clientY, items });
  };

  const handleStartAdd = () => {
    setActiveIndex(null);
    setPreviewHex(null);
    setAddMode((v) => !v);
  };

  /** Deal a real, popular palette onto the UNLOCKED swatches; locked ones
   *  keep their hex. Draws work like a shuffled deck of cards: every palette
   *  in the library comes up exactly once (random order) before any repeats
   *  — with ~4.2k palettes, repetition is effectively never. */
  const deckRef = useRef<number[]>([]);
  const drawPaletteIndex = () => {
    if (deckRef.current.length === 0) {
      const deck = ALL_SHUFFLE_PALETTES.map((_, i) => i);
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      deckRef.current = deck;
    }
    return deckRef.current.pop()!;
  };
  /** Apply a palette's colors onto the unlocked swatches, in order. */
  const applyPalette = (paletteColors: string[]) => {
    const unlocked = orderedColors.filter((c) => !c.locked);
    if (unlocked.length === 0) return;
    setActiveIndex(null);
    setPreviewHex(null);
    const taken = new Set(
      orderedColors.filter((c) => c.locked).map((c) => (c.value ?? '').toUpperCase()),
    );
    const pool = paletteColors
      .map((h) => h.toUpperCase())
      .filter((h, i, arr) => arr.indexOf(h) === i && !taken.has(h));
    if (pool.length === 0) return;
    // Recolour the swatches that are free, then ADD whatever is left over.
    // Only replacing meant a brand holding one colour got one colour back and
    // the rest of the palette was silently dropped — picking a palette has to
    // give you the palette.
    unlocked.forEach((c, i) => {
      const hex = pool[i];
      if (!hex) return;
      onUpdate(c.id, hex);
    });
    for (const hex of pool.slice(unlocked.length)) onAdd(hex);
  };

  const handleShuffle = () => {
    const idx = drawPaletteIndex();
    // Extend with a second palette when the user has more unlocked swatches
    // than the drawn palette has colors.
    applyPalette([
      ...ALL_SHUFFLE_PALETTES[idx],
      ...ALL_SHUFFLE_PALETTES[(idx + 7) % ALL_SHUFFLE_PALETTES.length],
    ]);
  };

  // "All palettes" browser — burger menu next to the shuffle. Renders in
  // slices that grow as the list scrolls so ~4k palettes stay smooth.
  const [browseOpen, setBrowseOpen] = useState(false);
  const [browseCount, setBrowseCount] = useState(80);
  const onBrowseScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight > el.scrollHeight - 240) {
      setBrowseCount((c) => Math.min(c + 120, ALL_SHUFFLE_PALETTES.length));
    }
  };

  const activeColor = activeIndex != null ? orderedColors[activeIndex] : null;
  const pickerHex = activeColor?.value ?? '#5B6BFF';

  return (
    <article className="review-group">
      <header className="review-group-head">
        <h3>Colors</h3>
        {colors.length === 0 && suggestions.length > 0 ? (
          <SuggestedPalettesButton
            suggestions={suggestions}
            onPickPalette={(palette) => {
              for (const hex of palette.colors) onAdd(hex);
            }}
          />
        ) : (
          <span className="review-group-head-right">
            <Popover
              open={browseOpen}
              onOpenChange={(v) => {
                setBrowseOpen(v);
                if (v) setBrowseCount(80);
              }}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="colors-shuffle-btn"
                  title="Browse all palettes"
                  aria-label="Browse all palettes"
                  aria-expanded={browseOpen}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M4 6h16" />
                    <path d="M4 12h16" />
                    <path d="M4 18h16" />
                  </svg>
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="palette-browse-pop" style={{ width: 248, padding: 0 }}>
                <p className="palette-browse-hint">
                  All palettes · {ALL_SHUFFLE_PALETTES.length.toLocaleString()}
                </p>
                <div className="palette-browse-list" onScroll={onBrowseScroll}>
                  {ALL_SHUFFLE_PALETTES.slice(0, browseCount).map((palette, i) => (
                    <button
                      key={i}
                      type="button"
                      className="palette-browse-row"
                      title={palette.join(' · ')}
                      onClick={() => {
                        applyPalette(palette);
                        setBrowseOpen(false);
                      }}
                    >
                      {palette.map((hex, j) => (
                        <span key={`${hex}-${j}`} className="palette-browse-chip" style={{ background: hex }} />
                      ))}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <button
              type="button"
              className="colors-shuffle-btn"
              title="Shuffle colors (locked ones stay)"
              aria-label="Shuffle unlocked colors"
              onClick={handleShuffle}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.8-1.1 2-1.7 3.3-1.7H22" />
                <path d="m18 2 4 4-4 4" />
                <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2" />
                <path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8" />
                <path d="m18 14 4 4-4 4" />
              </svg>
            </button>
            <span className="review-group-count">
              {colors.length} {colors.length === 1 ? 'color' : 'colors'}
            </span>
          </span>
        )}
      </header>

      <div data-workspace data-theme={theme} className="onboarding-colors-scope" ref={groupRef}>
        {colors.length === 0 ? (
          <p className="review-group-empty">No colors yet — extract from your logos, or pick a color below.</p>
        ) : (
          <div className="colors-group">
            <div className="colors-row" data-layout="accent">
              {orderedColors.map((c, i) => {
                const renderedHex =
                  activeIndex === i && previewHex ? previewHex : (c.value ?? '#000000');
                return (
                  <Swatch
                    key={c.id}
                    hex={c.value ?? '#000000'}
                    renderedHex={renderedHex}
                    isActive={activeIndex === i}
                    isPrimary={primaryColorId ? primaryColorId === c.id : i === 0}
                    isLocked={!!c.locked}
                    zIndex={i + 1}
                    onPickerToggle={() => handleSwatchClick(i)}
                    onCopy={(text, anchor) => handleCopy(text, anchor)}
                    onSetPrimary={() => setPrimaryColor(c.id)}
                    onToggleLock={() => onToggleLock(c.id)}
                    onDelete={() => {
                      onRemove(c.id);
                      if (activeIndex != null && orderedColors[activeIndex]?.id === c.id) {
                        setActiveIndex(null);
                        setPreviewHex(null);
                      }
                    }}
                    onContextMenu={(e) => openColorMenu(e, c, i)}
                    buttonRef={(el) => {
                      if (el) swatchRefs.current.set(c.id, el);
                      else swatchRefs.current.delete(c.id);
                    }}
                  />
                );
              })}
            </div>
            <div
              className={`cp-expand${activeIndex != null ? ' is-open' : ''}`}
              aria-hidden={activeIndex == null}
            >
              {activeColor && (
                <ColorPickerHSV
                  key={`edit-${activeColor.id}`}
                  hex={pickerHex}
                  onChange={(h) => setPreviewHex(h)}
                  onCommit={(h) => {
                    onUpdate(activeColor.id, h);
                    setActiveIndex(null);
                    setPreviewHex(null);
                    settleFocus();
                  }}
                  onCancel={() => {
                    setActiveIndex(null);
                    setPreviewHex(null);
                    settleFocus();
                  }}
                />
              )}
            </div>
          </div>
        )}

        <div className={`cp-expand${addMode ? ' is-open' : ''}`} aria-hidden={!addMode}>
          {addMode && (
            <ColorPickerHSV
              key="add"
              autoFocusHex
              hex={addDraft}
              onChange={(h) => setAddDraft(h)}
              onCommit={(h) => {
                const normalized = normalizeHex(h);
                if (!normalized) return;
                const existing = colors.find(
                  (c) => (c.value ?? '').toUpperCase() === normalized,
                );
                if (existing) {
                  const el = swatchRefs.current.get(existing.id);
                  if (el) {
                    const rect = el.getBoundingClientRect();
                    const id = Date.now() + Math.random();
                    setFlash({
                      id,
                      text: 'Already in palette',
                      x: rect.left + rect.width / 2,
                      y: rect.top,
                    });
                    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
                    flashTimerRef.current = window.setTimeout(() => setFlash(null), 1400);
                  }
                } else {
                  onAdd(normalized);
                }
                setAddMode(false);
                setAddDraft('#5B6BFF');
                settleFocus();
              }}
              onCancel={() => {
                setAddMode(false);
                settleFocus();
              }}
              commitLabel="Add"
            />
          )}
        </div>

        {flash && (
          <div
            className="copy-flash is-on"
            style={{ left: flash.x, top: flash.y }}
            role="status"
            aria-live="polite"
          >
            {flash.text}
          </div>
        )}

        {ctxMenu && (
          <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} onClose={closeCtxMenu} />
        )}
      </div>

      <div className="review-group-foot review-group-foot-colors">
        <div className="review-group-foot-actions">
          <button
            type="button"
            className={`add-more-btn${addMode ? ' is-open' : ''}`}
            onClick={handleStartAdd}
            aria-expanded={addMode}
          >
            <span className="add-more-plus" aria-hidden="true">+</span>
            {addMode ? 'Close picker' : 'Add color'}
          </button>
          <button type="button" className="add-more-btn add-more-btn-ghost" onClick={onExtract}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M9 12c0-1.66 1.34-3 3-3s3 1.34 3 3" />
              <path d="M12 3v3M21 12h-3M12 21v-3M3 12h3" />
            </svg>
            Extract from logos
          </button>
          <button
            type="button"
            className="add-more-btn add-more-btn-ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={extractingFromFile}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            {extractingFromFile ? 'Extracting…' : 'Extract from image'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept="image/*,.svg"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              setExtractingFromFile(true);
              try {
                await onExtractFromFile(file);
              } finally {
                setExtractingFromFile(false);
              }
            }}
          />
        </div>
      </div>
    </article>
  );
}

/** "✨ Add suggested palette" — sits where the color count normally lives,
 *  only while the palette is empty. Palettes are matched from the brand
 *  description (industry/style keywords); picking one adds all its colors. */
function SuggestedPalettesButton({
  suggestions,
  onPickPalette,
}: {
  suggestions: SuggestedPalette[];
  onPickPalette(palette: SuggestedPalette): void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="suggest-palettes-btn" aria-expanded={open}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2l1.9 5.8L20 9.6l-5 4 1.5 6.2L12 16.4l-4.5 3.4L9 13.6l-5-4 6.1-1.8L12 2z" />
          </svg>
          Add suggested palettes
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="palette-suggest-pop" style={{ width: 264, padding: 6 }}>
        <p className="palette-suggest-hint">Based on what you told us about your brand</p>
        {suggestions.map((palette) => (
          <button
            key={palette.id}
            type="button"
            className="palette-suggest-row"
            onClick={() => {
              onPickPalette(palette);
              setOpen(false);
            }}
          >
            <span className="palette-suggest-name">{palette.name}</span>
            <span className="palette-suggest-chips" aria-hidden="true">
              {palette.colors.map((hex) => (
                <span key={hex} className="palette-suggest-chip" style={{ background: hex }} />
              ))}
            </span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/** "✨ Add suggested fonts" — same pattern as the palettes button, on the
 *  Fonts group while it's empty. Picking a pairing adds both Google Font
 *  families (heading + body). */
function SuggestedFontsButton({
  suggestions,
  onPickPairing,
}: {
  suggestions: SuggestedFontPairing[];
  onPickPairing(pairing: SuggestedFontPairing): void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        // Load the pairing fonts so the popover previews render true.
        if (v) for (const p of suggestions) {
          injectGoogleFont(p.heading);
          injectGoogleFont(p.body);
        }
      }}
    >
      <PopoverTrigger asChild>
        <button type="button" className="suggest-palettes-btn" aria-expanded={open}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2l1.9 5.8L20 9.6l-5 4 1.5 6.2L12 16.4l-4.5 3.4L9 13.6l-5-4 6.1-1.8L12 2z" />
          </svg>
          Add suggested fonts
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="palette-suggest-pop" style={{ width: 260, padding: 6 }}>
        <p className="palette-suggest-hint">Based on what you told us about your brand</p>
        {suggestions.map((pairing) => (
          <button
            key={pairing.id}
            type="button"
            className="palette-suggest-row font-suggest-row"
            onClick={() => {
              onPickPairing(pairing);
              setOpen(false);
            }}
          >
            <span className="gfp-item-preview" style={{ fontFamily: `'${pairing.heading}', sans-serif` }}>
              {FONT_PREVIEW_TEXT}
            </span>
            <span className="font-suggest-meta-line">
              <span className="palette-suggest-name">{pairing.name}</span>
              <span className="font-suggest-families">
                {pairing.heading}
                {pairing.body !== pairing.heading ? ` + ${pairing.body}` : ''}
              </span>
            </span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function LinksFooter({ onAdd }: { onAdd(rawInput: string, preferredPlatformId?: string): boolean }) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState(false);

  const submit = () => {
    if (!value.trim()) return;
    const ok = onAdd(value);
    if (ok) {
      setValue('');
      setError(false);
    } else {
      setError(true);
    }
  };

  const detected = value.trim() ? detectPlatform(value).platform : null;

  return (
    <div className="review-group-foot review-group-foot-links">
      <div className={`links-input-row${error ? ' is-error' : ''}`}>
        <span className="links-input-icon" aria-hidden="true">
          {detected ? detected.icon : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
              <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
            </svg>
          )}
        </span>
        <input
          ref={inputRef}
          type="text"
          className="links-input"
          placeholder="Paste a URL or @handle"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button type="button" className="add-more-btn add-more-btn-tight" onClick={submit}>
          <span className="add-more-plus" aria-hidden="true">+</span>
          Add
        </button>
      </div>
    </div>
  );
}

function FontsFooter({ onUpload, onPick }: { onUpload(f: File): void; onPick(family: string): boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="review-group-foot review-group-foot-fonts">
      <GoogleFontPicker onPick={onPick} />
      <button type="button" className="add-more-btn add-more-btn-ghost" onClick={() => fileRef.current?.click()}>
        <span className="add-more-plus" aria-hidden="true">+</span>
        Upload font
      </button>
      <input
        ref={fileRef}
        type="file"
        multiple
        hidden
        accept=".otf,.ttf,.woff,.woff2"
        onChange={(e) => {
          if (e.target.files) for (let i = 0; i < e.target.files.length; i++) onUpload(e.target.files[i]);
          e.target.value = '';
        }}
      />
    </div>
  );
}

function GoogleFontPicker({ onPick }: { onPick(family: string): boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // Callback-ref as state: the Popover content mounts in a portal AFTER the
  // open-effect would have run, so a plain useRef misses it and the observer
  // never gets created. State-ref re-fires the effect once the list exists.
  const [listEl, setListEl] = useState<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return GOOGLE_FONTS.slice(0, 80);
    return GOOGLE_FONTS.filter((name) => name.toLowerCase().includes(q)).slice(0, 80);
  }, [query]);

  // Load each family's stylesheet as its row scrolls into view, so the
  // preview line renders in the real typeface without fetching all 80
  // fonts up front. injectGoogleFont dedupes, unobserve after first hit.
  useEffect(() => {
    if (!listEl) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const fam = (entry.target as HTMLElement).dataset.family;
          if (fam) injectGoogleFont(fam);
          obs.unobserve(entry.target);
        }
      },
      { root: listEl, rootMargin: '160px' },
    );
    listEl.querySelectorAll<HTMLElement>('[data-family]').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [listEl, filtered]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="add-more-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
          </svg>
          Pick from Google Fonts
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="google-fonts-popover" style={{ width: 272, padding: 0 }}>
        <div className="gfp-input-wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            autoFocus
            type="text"
            className="gfp-input"
            placeholder="Search fonts…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="gfp-list" ref={setListEl}>
          {filtered.length === 0 ? (
            <p className="gfp-empty">No matches.</p>
          ) : (
            filtered.map((name) => (
              <button
                key={name}
                type="button"
                className="gfp-item"
                data-family={name}
                onClick={() => {
                  if (onPick(name)) {
                    setOpen(false);
                    setQuery('');
                  }
                }}
              >
                <span className="gfp-item-preview" style={{ fontFamily: `'${name}', sans-serif` }}>
                  {FONT_PREVIEW_TEXT}
                </span>
                <span className="gfp-item-name">{name}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const injectedFonts = new Set<string>();
function injectGoogleFont(family: string) {
  if (injectedFonts.has(family)) return;
  injectedFonts.add(family);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}:wght@400;500;700&display=swap`;
  document.head.appendChild(link);
}
