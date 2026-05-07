import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useV4Store } from '../store/onboardingV4Store';
import type { AssetKind, OnboardingAsset } from '../types';
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

const MAX_ASSETS = 20;

interface Group {
  id: 'fonts' | 'links';
  label: string;
  empty: string;
  match: (a: OnboardingAsset) => boolean;
}

const GROUPS: Group[] = [
  {
    id: 'fonts',
    label: 'Fonts',
    empty: 'No fonts yet — pick from Google Fonts or upload a font file.',
    match: (a) => a.kind === 'font',
  },
  {
    id: 'links',
    label: 'Links',
    empty: 'No links added.',
    match: (a) => a.kind === 'link',
  },
];

interface AssetRowProps {
  asset: OnboardingAsset;
  onRename(name: string): void;
  onRemove(): void;
  onMove(target: MoveTarget): void;
  onContextMenu?(e: React.MouseEvent<HTMLDivElement>): void;
}

type MoveTarget = 'logo' | 'image' | 'color' | 'color-replace' | 'document' | 'font';

function AssetRow({ asset, onRename, onRemove, onMove, onContextMenu }: AssetRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(asset.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft.trim() && draft.trim() !== asset.name) onRename(draft.trim());
    else setDraft(asset.name);
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
          <span className="asset-thumb-platform">{getPlatform(asset.socialPlatform).icon}</span>
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
                setDraft(asset.name);
                setEditing(false);
              }
            }}
          />
        ) : (
          <button type="button" className="asset-name" onClick={() => setEditing(true)} title="Rename">
            {asset.name}
          </button>
        )}
        <span className="asset-sub">{asset.sub}</span>
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

export function UploadsReviewPanel() {
  const assets = useV4Store((s) => s.assets);
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
      const exists = useV4Store.getState().assets.some((a) => a.kind === 'color' && a.value === hex);
      if (exists) return false;
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
    [addAsset]
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
        <article className="review-group review-group-logos">
          <header className="review-group-head">
            <h3>Logos</h3>
            <span className="review-group-count">
              {assets.filter((a) => a.kind === 'image' && a.isLogo).length}
            </span>
          </header>
          <LogoSlots assets={assets} />
        </article>

        <ColorsBoard
          colors={assets.filter((a) => a.kind === 'color')}
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

        <AboutGroup />
      </div>
    </section>
  );
}

interface GroupCardProps {
  group: Group;
  items: OnboardingAsset[];
  onUploadFile(file: File): void;
  onAddColor(hex: string): boolean;
  onAddGoogleFont(family: string): boolean;
  onAddLink(rawInput: string, preferredPlatformId?: string): boolean;
  onExtractColors(): void;
  onRename(id: string, name: string): void;
  onMove(id: string, target: MoveTarget): void;
  onRemove(id: string): void;
}

function GroupCard({ group, items, onUploadFile, onAddColor, onAddGoogleFont, onAddLink, onExtractColors, onRename, onMove, onRemove }: GroupCardProps) {
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);
  const ctxAnchorRef = useRef<HTMLElement | null>(null);

  const closeCtxMenu = useCallback(() => {
    ctxAnchorRef.current?.classList.remove('is-ctx-active');
    ctxAnchorRef.current = null;
    setCtxMenu(null);
  }, []);

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
        <span className="review-group-count">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </header>
      {items.length === 0 ? (
        <p className="review-group-empty">{group.empty}</p>
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
  zIndex: number;
  onPickerToggle(): void;
  onCopyHex(anchor: HTMLElement): void;
  onContextMenu?(e: React.MouseEvent<HTMLButtonElement>): void;
}

/** Onboarding-v4 colors swatch — mirrors the Setup page's Swatch markup so the
 *  shared `[data-workspace] .swatch` styles apply identically (same
 *  hover wave, same name/hex copy affordance, same active picker state). */
function Swatch({ hex, renderedHex, isActive, zIndex, onPickerToggle, onCopyHex, onContextMenu }: SwatchProps) {
  const iconRef = useRef<OrganicIconHandle>(null);
  const resetTimerRef = useRef<number | null>(null);
  const light = isLightHex(renderedHex);
  const handleCopyClick = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    onCopyHex(e.currentTarget);
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
  const displayName = hexToName(hex);
  return (
    <button
      type="button"
      className={`swatch${light ? ' is-light' : ''}${isActive ? ' is-active' : ''}`}
      style={{ background: renderedHex, zIndex }}
      aria-label={`Edit ${displayName} ${renderedHex}`}
      aria-expanded={isActive}
      onClick={(e) => {
        e.stopPropagation();
        onPickerToggle();
      }}
      onContextMenu={onContextMenu}
    >
      <span
        className="swatch-name"
        role="button"
        tabIndex={-1}
        onClick={handleCopyClick}
      >
        {displayName}
        <span className="swatch-copy-icon" aria-hidden onClick={handleCopyClick}>
          <CopyIcon ref={iconRef} size={13} />
        </span>
      </span>
      <span
        className="swatch-hex"
        role="button"
        tabIndex={-1}
        onClick={handleCopyClick}
      >
        {renderedHex.toUpperCase()}
      </span>
    </button>
  );
}

interface ColorsBoardProps {
  colors: OnboardingAsset[];
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
function ColorsBoard({ colors, onAdd, onUpdate, onRemove, onExtract, onExtractFromFile }: ColorsBoardProps) {
  const [theme] = useCosmosTheme();
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

  const handleSwatchClick = (i: number) => {
    setAddMode(false);
    setActiveIndex((prev) => {
      if (prev === i) {
        setPreviewHex(null);
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
    const items: ContextMenuState['items'] = [
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
          if (activeIndex != null && colors[activeIndex]?.id === color.id) {
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

  const activeColor = activeIndex != null ? colors[activeIndex] : null;
  const pickerHex = activeColor?.value ?? '#5B6BFF';

  return (
    <article className="review-group">
      <header className="review-group-head">
        <h3>Colors</h3>
        <span className="review-group-count">
          {colors.length} {colors.length === 1 ? 'item' : 'items'}
        </span>
      </header>

      <div data-workspace data-theme={theme} className="onboarding-colors-scope" ref={groupRef}>
        {colors.length === 0 ? (
          <p className="review-group-empty">No colors yet — extract from your logos, or pick a color below.</p>
        ) : (
          <div className="colors-group">
            <div className="colors-row" data-layout="accent">
              {colors.map((c, i) => {
                const renderedHex =
                  activeIndex === i && previewHex ? previewHex : (c.value ?? '#000000');
                return (
                  <Swatch
                    key={c.id}
                    hex={c.value ?? '#000000'}
                    renderedHex={renderedHex}
                    isActive={activeIndex === i}
                    zIndex={i + 1}
                    onPickerToggle={() => handleSwatchClick(i)}
                    onCopyHex={(anchor) => handleCopy(renderedHex.toUpperCase(), anchor)}
                    onContextMenu={(e) => openColorMenu(e, c, i)}
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
                  }}
                  onCancel={() => {
                    setActiveIndex(null);
                    setPreviewHex(null);
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
              hex={addDraft}
              onChange={(h) => setAddDraft(h)}
              onCommit={(h) => {
                if (onAdd(h)) {
                  setAddMode(false);
                  setAddDraft('#5B6BFF');
                }
              }}
              onCancel={() => setAddMode(false)}
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return GOOGLE_FONTS.slice(0, 80);
    return GOOGLE_FONTS.filter((name) => name.toLowerCase().includes(q)).slice(0, 80);
  }, [query]);

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
      <PopoverContent align="start" className="google-fonts-popover" style={{ width: 280, padding: 0 }}>
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
        <div className="gfp-list">
          {filtered.length === 0 ? (
            <p className="gfp-empty">No matches.</p>
          ) : (
            filtered.map((name) => (
              <button
                key={name}
                type="button"
                className="gfp-item"
                onMouseEnter={() => injectGoogleFont(name)}
                onClick={() => {
                  if (onPick(name)) {
                    setOpen(false);
                    setQuery('');
                  }
                }}
                style={{ fontFamily: `'${name}', sans-serif` }}
              >
                {name}
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
