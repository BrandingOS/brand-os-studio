import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Loader2, ImageOff, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  getConfiguredProviders,
  type StockPhoto,
  type StockPhotoProvider,
} from '../lib/stockPhotos';

interface Props {
  /** Called when user picks a photo. */
  onPick: (photo: StockPhoto) => void;
  /** Optional initial query (e.g. brand tone). */
  initialQuery?: string;
}

/**
 * Stock photo search panel. Shows a tab bar of whichever providers have
 * their API keys configured, a search box, and a grid of results.
 */
export function StockPhotoSearch({ onPick, initialQuery }: Props) {
  const providers = useMemo(() => getConfiguredProviders(), []);
  const [activeId, setActiveId] = useState<string | null>(providers[0]?.id ?? null);
  const active = providers.find((p) => p.id === activeId) ?? null;

  const [query, setQuery] = useState(initialQuery ?? '');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<StockPhoto[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<number | null>(null);

  // Debounced search when query or provider changes.
  useEffect(() => {
    if (!active) return;
    if (!query.trim()) {
      setResults([]);
      setHasMore(false);
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void runSearch(active, query.trim(), 1, false);
    }, 350);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, activeId]);

  const runSearch = async (
    provider: StockPhotoProvider,
    q: string,
    pg: number,
    append: boolean,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const r = await provider.search(q, { page: pg, perPage: 24 });
      setResults((prev) => (append ? [...prev, ...r.results] : r.results));
      setPage(pg);
      setHasMore(r.results.length === r.perPage && r.total > pg * r.perPage);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Search failed';
      setError(msg);
      toast.error(`${provider.name}: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  if (providers.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-center space-y-2">
        <ImageOff className="h-5 w-5 mx-auto text-muted-foreground" />
        <div className="text-sm font-medium">No photo providers configured</div>
        <div className="text-xs text-muted-foreground leading-snug">
          Add at least one of <code className="font-mono">VITE_UNSPLASH_ACCESS_KEY</code>,
          {' '}<code className="font-mono">VITE_PEXELS_API_KEY</code>, or
          {' '}<code className="font-mono">VITE_PIXABAY_API_KEY</code> to <code>.env</code>.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Provider tabs */}
      {providers.length > 1 && (
        <div className="flex gap-1 rounded-md bg-muted p-0.5">
          {providers.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActiveId(p.id)}
              className={cn(
                'flex-1 text-xs font-medium py-1.5 rounded transition-colors',
                p.id === activeId ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Search box */}
      <div className="relative">
        <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${active?.name ?? ''}…`}
          className="h-8 pl-8 text-xs"
        />
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />}
      </div>

      {/* Results grid */}
      {error && (
        <div className="text-xs text-destructive">{error}</div>
      )}

      {results.length === 0 && !loading && query.trim() && !error && (
        <div className="text-xs text-muted-foreground text-center py-4">No results</div>
      )}

      {results.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-1.5">
            {results.map((photo) => (
              <button
                key={`${photo.provider}-${photo.id}`}
                type="button"
                onClick={() => onPick(photo)}
                title={`by ${photo.author}`}
                className="group relative aspect-square rounded overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all"
                style={{ background: photo.color ?? '#e2e8f0' }}
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
              onClick={() => active && runSearch(active, query, page + 1, true)}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Load more'}
            </Button>
          )}
        </>
      )}

      {/* Attribution footer */}
      {active && (
        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
          Photos from
          <a
            href={attributionUrl(active.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="underline inline-flex items-center gap-0.5"
          >
            {active.name}
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
      )}
    </div>
  );
}

function attributionUrl(id: string): string {
  switch (id) {
    case 'unsplash': return 'https://unsplash.com';
    case 'pexels': return 'https://www.pexels.com';
    case 'pixabay': return 'https://pixabay.com';
    default: return '#';
  }
}
