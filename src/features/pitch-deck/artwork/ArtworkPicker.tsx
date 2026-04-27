/**
 * ArtworkPicker — replace an SVG illustration with a photo.
 *
 * Two tabs:
 *   - Upload: file input → in-memory data URL → set as override
 *   - Unsplash: search box + grid using the existing
 *     `unsplashProvider` from @/features/bento/lib/stockPhotos
 *
 * Picks call `onPick(override)` and the dialog closes. The host stores
 * the override via `useArtworkStore` and re-renders the slot.
 */

import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Search, Sparkles, Upload } from 'lucide-react';
import { unsplashProvider } from '@/features/bento/lib/stockPhotos/unsplash';
import type { StockPhoto } from '@/features/bento/lib/stockPhotos/types';
import type { ArtworkOverride } from './artworkStore';

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (override: ArtworkOverride) => void;
  /** Optional default search query for Unsplash (e.g. slot's name). */
  defaultQuery?: string;
}

export function ArtworkPicker({ open, onClose, onPick, defaultQuery }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Replace artwork</DialogTitle>
          <DialogDescription>
            Upload an image from your device or pick one from Unsplash.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="illustrations" className="mt-2">
          <TabsList>
            <TabsTrigger value="illustrations">
              <Sparkles className="w-4 h-4 mr-2" /> 3D Illustrations
            </TabsTrigger>
            <TabsTrigger value="unsplash">
              <Search className="w-4 h-4 mr-2" /> Unsplash
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="w-4 h-4 mr-2" /> Upload
            </TabsTrigger>
          </TabsList>
          <TabsContent value="illustrations" className="mt-4">
            <IllustrationsPane onPick={onPick} defaultQuery={defaultQuery} />
          </TabsContent>
          <TabsContent value="unsplash" className="mt-4">
            <UnsplashPane onPick={onPick} defaultQuery={defaultQuery} />
          </TabsContent>
          <TabsContent value="upload" className="mt-4">
            <UploadPane onPick={onPick} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────── Upload pane ───────────────────── */

function UploadPane({ onPick }: { onPick: (o: ArtworkOverride) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Pick an image file (PNG, JPG, WebP, SVG, etc.)');
      return;
    }
    // 8 MB cap — data URLs over that bloat localStorage and slow the
    // page noticeably on every render.
    if (file.size > 8 * 1024 * 1024) {
      setError('File too large — pick something under 8 MB.');
      return;
    }
    setError(null);
    setReading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setReading(false);
      const url = String(reader.result ?? '');
      if (!url) {
        setError('Could not read the file.');
        return;
      }
      onPick({ url, source: 'upload' });
    };
    reader.onerror = () => {
      setReading(false);
      setError('Could not read the file.');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
      style={{
        border: '2px dashed hsl(var(--border))',
        borderRadius: 12,
        padding: 36,
        textAlign: 'center',
        background: 'hsl(var(--muted) / 0.3)',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <Upload className="w-8 h-8 mx-auto mb-3" style={{ color: 'hsl(var(--muted-foreground))' }} />
      <div style={{ fontSize: 14, color: 'hsl(var(--foreground))', marginBottom: 6 }}>
        Drag & drop an image here
      </div>
      <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginBottom: 16 }}>
        or
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={reading}
        style={{
          padding: '8px 18px',
          borderRadius: 8,
          border: 'none',
          background: 'hsl(var(--primary))',
          color: 'hsl(var(--primary-foreground))',
          fontSize: 13,
          fontWeight: 500,
          cursor: reading ? 'wait' : 'pointer',
        }}
      >
        {reading ? 'Reading…' : 'Choose file'}
      </button>
      {error && (
        <div style={{ marginTop: 14, fontSize: 12, color: 'hsl(var(--destructive))' }}>
          {error}
        </div>
      )}
      <div style={{ marginTop: 18, fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
        PNG · JPG · WebP · SVG · up to 8 MB
      </div>
    </div>
  );
}

/* ───────────────────── Illustrations pane (Iconify) ───────────────────── */

/**
 * Iconify is a free, no-key icon/illustration library aggregator.
 * The `flat-color-icons`, `fluent-emoji`, `noto`, `streamline-emojis`
 * collections give us 3D / colored illustrations. We restrict the
 * search via the `prefixes` parameter to keep results illustration-y
 * (not stroke-only icons that are too lightweight for a slide).
 */
const ILLUSTRATION_PREFIXES = [
  'fluent-emoji',     // Microsoft 3D emoji — best 3D look
  'noto',             // Google Noto emoji — friendly 3D-ish
  'streamline-emojis',// Streamline 3D emojis
  'flat-color-icons', // Flat colored business icons
  'twemoji',          // Twitter colored emojis
].join(',');

interface IconifyResult {
  prefix: string;
  name: string;
  /** Full id `prefix:name` for rendering. */
  id: string;
}

async function searchIconify(query: string): Promise<IconifyResult[]> {
  if (!query.trim()) return [];
  const url = `https://api.iconify.design/search?query=${encodeURIComponent(query)}&prefixes=${ILLUSTRATION_PREFIXES}&limit=48`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Iconify ${res.status}`);
  const data = (await res.json()) as { icons: string[] };
  return (data.icons ?? []).map((id) => {
    const [prefix, name] = id.split(':');
    return { prefix, name, id };
  });
}

/** SVG render URL — height controls quality, browser caches it. */
function iconifyImageUrl(id: string, size = 480): string {
  return `https://api.iconify.design/${id.replace(':', '/')}.svg?height=${size}`;
}

function IllustrationsPane({
  onPick,
  defaultQuery,
}: {
  onPick: (o: ArtworkOverride) => void;
  defaultQuery?: string;
}) {
  const [query, setQuery] = useState(defaultQuery ?? 'team');
  const [debounced, setDebounced] = useState(query);
  const [results, setResults] = useState<IconifyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!debounced.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    searchIconify(debounced.trim())
      .then((res) => {
        if (cancelled) return;
        setResults(res);
        setLoading(false);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  return (
    <div>
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search
          className="w-4 h-4"
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'hsl(var(--muted-foreground))',
          }}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search 3D illustrations — team, mentor, graduation, chart, trophy"
          style={{
            width: '100%',
            padding: '10px 14px 10px 40px',
            border: '1px solid hsl(var(--border))',
            borderRadius: 10,
            fontSize: 13,
            background: 'hsl(var(--background))',
            color: 'hsl(var(--foreground))',
            outline: 'none',
          }}
          autoFocus
        />
      </div>

      {loading && (
        <div style={{ padding: 32, textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
          <Loader2 className="w-5 h-5 animate-spin inline-block" />
        </div>
      )}

      {error && (
        <div style={{ padding: 16, fontSize: 12, color: 'hsl(var(--destructive))' }}>
          {error}
        </div>
      )}

      {!loading && !error && results.length === 0 && debounced.trim() && (
        <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>
          No illustrations for "{debounced}". Try: graduation, laptop, chart, mentor, handshake.
        </div>
      )}

      {results.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: 10,
            maxHeight: 420,
            overflowY: 'auto',
            paddingRight: 4,
          }}
        >
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() =>
                onPick({
                  url: iconifyImageUrl(r.id, 800),
                  source: 'illustration',
                  authorName: r.prefix,
                  authorUrl: `https://icon-sets.iconify.design/${r.prefix}/`,
                })
              }
              style={{
                position: 'relative',
                aspectRatio: '1 / 1',
                padding: 10,
                border: '1px solid hsl(var(--border))',
                borderRadius: 10,
                background: 'hsl(var(--background))',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title={`${r.prefix}: ${r.name}`}
            >
              <img
                src={iconifyImageUrl(r.id, 200)}
                alt={r.name}
                loading="lazy"
                style={{ maxWidth: '100%', maxHeight: '100%', display: 'block' }}
              />
            </button>
          ))}
        </div>
      )}

      <div style={{ marginTop: 14, fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
        Powered by{' '}
        <a href="https://iconify.design/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', color: 'inherit' }}>
          Iconify
        </a>{' '}
        · Fluent Emoji 3D · Noto · Streamline · Flat Color Icons · Twemoji
      </div>
    </div>
  );
}

/* ───────────────────── Unsplash pane ───────────────────── */

function UnsplashPane({
  onPick,
  defaultQuery,
}: {
  onPick: (o: ArtworkOverride) => void;
  defaultQuery?: string;
}) {
  const [query, setQuery] = useState(defaultQuery ?? '');
  const [debounced, setDebounced] = useState(query);
  const [results, setResults] = useState<StockPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!debounced.trim()) {
      setResults([]);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    unsplashProvider
      .search(debounced.trim(), { page: 1, perPage: 24 })
      .then((res) => {
        if (cancelled) return;
        setResults(res.results);
        setLoading(false);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  if (!unsplashProvider.isConfigured()) {
    return (
      <div style={{ padding: 24, fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>
        Unsplash isn't configured. Add <code>VITE_UNSPLASH_ACCESS_KEY</code> to{' '}
        <code>.env</code> to enable photo search.
      </div>
    );
  }

  return (
    <div>
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search
          className="w-4 h-4"
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'hsl(var(--muted-foreground))',
          }}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search photos — e.g. classroom, students, library, mentor"
          style={{
            width: '100%',
            padding: '10px 14px 10px 40px',
            border: '1px solid hsl(var(--border))',
            borderRadius: 10,
            fontSize: 13,
            background: 'hsl(var(--background))',
            color: 'hsl(var(--foreground))',
            outline: 'none',
          }}
          autoFocus
        />
      </div>

      {loading && (
        <div style={{ padding: 32, textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
          <Loader2 className="w-5 h-5 animate-spin inline-block" />
        </div>
      )}

      {error && (
        <div style={{ padding: 16, fontSize: 12, color: 'hsl(var(--destructive))' }}>
          {error}
        </div>
      )}

      {!loading && !error && results.length === 0 && debounced.trim() && (
        <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>
          No photos for "{debounced}". Try a broader keyword.
        </div>
      )}

      {results.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8,
            maxHeight: 420,
            overflowY: 'auto',
            paddingRight: 4,
          }}
        >
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={async () => {
                // Fire the Unsplash download ping (required by their
                // API guidelines when an image is "used") then commit
                // the override.
                try {
                  await p.trackDownload?.();
                } catch {
                  /* non-fatal */
                }
                onPick({
                  url: p.regularUrl,
                  source: 'unsplash',
                  authorName: p.author,
                  authorUrl: p.authorUrl,
                });
              }}
              style={{
                position: 'relative',
                aspectRatio: '1 / 1',
                padding: 0,
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                overflow: 'hidden',
                background: p.color ?? 'hsl(var(--muted))',
                cursor: 'pointer',
              }}
              title={`Photo by ${p.author}`}
            >
              <img
                src={p.thumbUrl}
                alt={`Photo by ${p.author}`}
                loading="lazy"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
