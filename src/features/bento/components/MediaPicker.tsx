import { useCallback, useEffect, useRef, useState } from 'react';
import { DsBanner, DsButton, DsDropZone, DsEmptyState, DsInput, DsModal, DsTabBar } from '@/shared/ds';
import { Upload, FolderOpen, Search, Loader2, ExternalLink } from 'lucide-react';
import type { Brand, Asset } from '@/shared/types/brand';
import { toast } from 'sonner';
import {
  ALL_PROVIDERS,
  getConfiguredProviders,
  type StockPhoto,
  type StockPhotoProvider,
} from '../lib/stockPhotos';

export type MediaPickResult =
  | { kind: 'file'; file: File }
  | { kind: 'asset'; asset: Asset }
  | { kind: 'stock'; photo: StockPhoto };

interface Props {
  open: boolean;
  onClose: () => void;
  brand: Brand | null | undefined;
  /** Default tab id. */
  defaultTab?: TabId;
  onPick: (result: MediaPickResult) => void;
  /** Prefill the stock search box. */
  defaultQuery?: string;
}

type TabId = 'upload' | 'brand' | 'unsplash' | 'pexels' | 'pixabay' | 'giphy';

interface Tab {
  id: TabId;
  label: string;
  enabled: boolean;
  providerHint?: StockPhotoProvider;
}

/**
 * Unified media picker. All image sources in one dialog behind a tab
 * bar: direct upload, brand assets library, and each configured stock
 * provider. Returns a single `MediaPickResult` via onPick so the caller
 * can run whatever downstream flow (usually the save-to-brand prompt).
 */
export function MediaPicker({ open, onClose, brand, defaultTab, onPick, defaultQuery }: Props) {
  const configured = getConfiguredProviders();
  const tabs: Tab[] = [
    { id: 'upload', label: 'Upload', enabled: true },
    { id: 'brand', label: 'Brand assets', enabled: !!brand && (brand.assets?.length ?? 0) > 0 },
    ...ALL_PROVIDERS.map((p) => ({
      id: p.id as TabId,
      label: p.name,
      enabled: configured.some((c) => c.id === p.id),
      providerHint: p,
    })),
  ];

  const enabledTabs = tabs.filter((t) => t.enabled);
  const initialTab: TabId = defaultTab && enabledTabs.some((t) => t.id === defaultTab)
    ? defaultTab
    : enabledTabs[0]?.id ?? 'upload';
  const [active, setActive] = useState<TabId>(initialTab);

  useEffect(() => {
    if (open) setActive(initialTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <DsModal
      open={open}
      onClose={onClose}
      title="Add media"
      eyebrow="Media"
      size="lg"
    >
      <p className="bento-modal-lede">
        Upload, pull from your brand, or search stock photo libraries.
      </p>

      <DsTabBar
        aria-label="Media source"
        value={active}
        onChange={(v) => setActive(v as TabId)}
        tabs={enabledTabs.map((t) => ({ value: t.id, label: t.label }))}
      />

      <div className="bento-media-body">
        {active === 'upload' && <UploadTab onPick={onPick} />}
        {active === 'brand' && <BrandAssetsTab brand={brand} onPick={onPick} />}
        {active !== 'upload' && active !== 'brand' && (
          <StockProviderTab
            provider={ALL_PROVIDERS.find((p) => p.id === active)!}
            defaultQuery={defaultQuery}
            onPick={onPick}
          />
        )}
      </div>
    </DsModal>
  );
}

// ─── Tab: upload ────────────────────────────────────────────────────
function UploadTab({ onPick }: { onPick: (r: MediaPickResult) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    onPick({ kind: 'file', file });
  };

  return (
    <DsDropZone
      className={dragging ? 'is-dragging' : undefined}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFile(e.dataTransfer.files?.[0] ?? null);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          handleFile(e.target.files?.[0] ?? null);
          e.target.value = '';
        }}
      />
      <Upload size={26} aria-hidden />
      <strong>Drop an image here, or click to browse</strong>
      <span>PNG, JPG, WEBP, SVG · up to 10&nbsp;MB</span>
    </DsDropZone>
  );
}

// ─── Tab: brand assets ──────────────────────────────────────────────
function BrandAssetsTab({ brand, onPick }: { brand: Brand | null | undefined; onPick: (r: MediaPickResult) => void }) {
  const assets = (brand?.assets ?? []).filter((a) => a.type === 'image' && !!a.url);
  const [query, setQuery] = useState('');
  const filtered = assets.filter((a) =>
    !query.trim() || a.name.toLowerCase().includes(query.toLowerCase()) || a.tags.some((t) => t.toLowerCase().includes(query.toLowerCase())),
  );

  if (assets.length === 0) {
    return (
      <DsEmptyState>
        <FolderOpen size={22} aria-hidden />
        No brand image assets yet — upload a photo first to build up your library.
      </DsEmptyState>
    );
  }

  return (
    <div className="bento-media-pane">
      <div className="bento-search">
        <Search size={14} className="bento-search-icon" aria-hidden />
        <DsInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search assets"
          aria-label="Search assets"
        />
      </div>
      {filtered.length === 0 ? (
        <DsEmptyState>No matches</DsEmptyState>
      ) : (
        <div className="bento-mediagrid">
          {filtered.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onPick({ kind: 'asset', asset: a })}
              className="bento-mediatile"
              title={a.name}
            >
              <img src={a.url} alt={a.name} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: stock provider ────────────────────────────────────────────
function StockProviderTab({
  provider,
  defaultQuery,
  onPick,
}: {
  provider: StockPhotoProvider;
  defaultQuery?: string;
  onPick: (r: MediaPickResult) => void;
}) {
  const [query, setQuery] = useState(defaultQuery ?? '');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<StockPhoto[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  const run = useCallback(async (q: string, pg: number, append: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const r = await provider.search(q, { page: pg, perPage: 30 });
      setResults((prev) => (append ? [...prev, ...r.results] : r.results));
      setPage(pg);
      setHasMore(r.results.length === r.perPage && r.total > pg * r.perPage);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Search failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    // Trending/default query on tab open (Giphy supports empty; others need a query)
    if (provider.id === 'giphy' && !query.trim()) {
      void run('', 1, false);
      return;
    }
    if (!query.trim()) { setResults([]); return; }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => void run(query.trim(), 1, false), 350);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [query, provider.id, run]);

  return (
    <div className="bento-media-pane">
      <div className="bento-search">
        <Search size={14} className="bento-search-icon" aria-hidden />
        <DsInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={provider.id === 'giphy' ? 'Search GIPHY (leave blank for trending)' : `Search ${provider.name}`}
          aria-label={`Search ${provider.name}`}
          autoFocus
        />
        {loading && <Loader2 size={14} className="bento-search-spin" aria-label="Searching" />}
      </div>

      {error && <DsBanner tone="danger">{error}</DsBanner>}

      {results.length === 0 && !loading && query.trim() && !error && (
        <DsEmptyState>No results</DsEmptyState>
      )}

      {results.length > 0 && (
        <>
          <div className="bento-mediagrid">
            {results.map((photo) => (
              <button
                key={`${photo.provider}-${photo.id}`}
                type="button"
                onClick={() => onPick({ kind: 'stock', photo })}
                title={`by ${photo.author}`}
                className="bento-mediatile"
                style={{ background: photo.color ?? 'var(--ds-surface-subtle)' }}
              >
                <img src={photo.thumbUrl} alt="" loading="lazy" crossOrigin="anonymous" />
                <span className="bento-mediatile-by">{photo.author}</span>
              </button>
            ))}
          </div>
          {hasMore && (
            <DsButton
              tone="secondary"
              size="sm"
              className="bento-block"
              disabled={loading}
              onClick={() => run(query || '', page + 1, true)}
            >
              {loading ? 'Loading…' : 'Load more'}
            </DsButton>
          )}
        </>
      )}

      <p className="bento-attrib">
        Powered by{' '}
        <a href={attributionUrl(provider.id)} target="_blank" rel="noopener noreferrer">
          {provider.name}
          <ExternalLink size={10} aria-hidden />
        </a>
      </p>
    </div>
  );
}

function attributionUrl(id: string): string {
  switch (id) {
    case 'unsplash': return 'https://unsplash.com';
    case 'pexels': return 'https://www.pexels.com';
    case 'pixabay': return 'https://pixabay.com';
    case 'giphy': return 'https://giphy.com';
    default: return '#';
  }
}
