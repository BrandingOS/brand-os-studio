import { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Upload, FolderOpen, Search, Loader2, ImageOff, ExternalLink } from 'lucide-react';
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
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 py-4 border-b">
          <DialogTitle>Add media</DialogTitle>
          <DialogDescription className="text-xs">
            Upload, pull from your brand, or search stock photo libraries.
          </DialogDescription>
        </DialogHeader>

        {/* Tab bar */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b overflow-x-auto">
          {enabledTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={cn(
                'px-3 pb-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap -mb-px',
                active === t.id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="max-h-[520px] overflow-y-auto">
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
      </DialogContent>
    </Dialog>
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
    <div className="p-6">
      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files?.[0] ?? null);
        }}
        className={cn(
          'block rounded-lg border-2 border-dashed transition-colors p-10 text-center cursor-pointer',
          dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files?.[0] ?? null);
            e.target.value = '';
          }}
        />
        <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
        <div className="text-sm font-medium mb-1">Drop an image here, or click to browse</div>
        <div className="text-xs text-muted-foreground">PNG, JPG, WEBP, SVG · up to 10&nbsp;MB</div>
      </label>
    </div>
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
      <div className="p-10 text-center">
        <FolderOpen className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
        <div className="text-sm font-medium mb-1">No brand image assets yet</div>
        <div className="text-xs text-muted-foreground">Upload a photo first to build up your library.</div>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-3">
      <div className="relative">
        <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search assets" className="h-8 pl-8 text-xs" />
      </div>
      {filtered.length === 0 ? (
        <div className="text-xs text-muted-foreground text-center py-6">No matches</div>
      ) : (
        <div className="grid grid-cols-5 gap-2">
          {filtered.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onPick({ kind: 'asset', asset: a })}
              className="group aspect-square rounded border overflow-hidden hover:ring-2 hover:ring-primary transition-all"
              title={a.name}
            >
              <img src={a.url} alt={a.name} className="w-full h-full object-cover" />
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
    <div className="p-5 space-y-3">
      <div className="relative">
        <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={provider.id === 'giphy' ? 'Search GIPHY (leave blank for trending)' : `Search ${provider.name}`}
          className="h-9 pl-8 text-sm"
          autoFocus
        />
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive flex items-center gap-2">
          <ImageOff className="h-3.5 w-3.5" /> {error}
        </div>
      )}

      {results.length === 0 && !loading && query.trim() && !error && (
        <div className="text-xs text-muted-foreground text-center py-6">No results</div>
      )}

      {results.length > 0 && (
        <>
          <div className="grid grid-cols-5 gap-2">
            {results.map((photo) => (
              <button
                key={`${photo.provider}-${photo.id}`}
                type="button"
                onClick={() => onPick({ kind: 'stock', photo })}
                title={`by ${photo.author}`}
                className="group relative aspect-square rounded overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                style={{ background: photo.color ?? '#E2E8F0' }}
              >
                <img
                  src={photo.thumbUrl}
                  alt=""
                  loading="lazy"
                  crossOrigin="anonymous"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-1">
                  <div className="text-[9px] text-white font-medium truncate">{photo.author}</div>
                </div>
              </button>
            ))}
          </div>
          {hasMore && (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              disabled={loading}
              onClick={() => run(query || '', page + 1, true)}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Load more'}
            </Button>
          )}
        </>
      )}

      <div className="text-[10px] text-muted-foreground flex items-center gap-1 pt-1">
        Powered by
        <a href={attributionUrl(provider.id)} target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-0.5">
          {provider.name}
          <ExternalLink className="h-2.5 w-2.5" />
        </a>
      </div>
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
