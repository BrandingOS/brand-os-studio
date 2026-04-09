/**
 * ToolLanding — public landing template shared by every tool.
 *
 * Hero + value props + upload card + "made with BrandOS" footer.
 * Each tool passes its meta and an `onLaunch` handler that receives
 * the user's source asset (file or pasted SVG string) and routes
 * them into the studio.
 *
 * SEO meta is set inline via document.title and meta tags. We avoid
 * react-helmet to keep the bundle small; for proper SSR/prerender,
 * the build step can hydrate these from `tool.meta.seo`.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Upload, Sparkles, Zap, Lock, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ToolMeta } from './types';

export interface LandingSource {
  kind: 'file' | 'svg' | 'sample';
  file?: File;
  svg?: string;
  sampleId?: string;
}

interface ToolLandingProps {
  meta: ToolMeta;
  onLaunch: (source: LandingSource) => void;
  /** Optional sample chips (e.g. "Try Raqm", "Try Meridian"). */
  samples?: { id: string; label: string; thumbnail?: string }[];
  /** Optional bullets shown under the hero. */
  features?: { icon: ReactNode; title: string; body: string }[];
}

const DEFAULT_FEATURES = [
  {
    icon: <Wand2 className="h-5 w-5" />,
    title: 'Brand-aware',
    body: 'Pulls colors and structure from your logo automatically.',
  },
  {
    icon: <Zap className="h-5 w-5" />,
    title: 'Every variant in seconds',
    body: 'Horizontal, stacked, mono, inverse, transparent — generated, not redrawn.',
  },
  {
    icon: <Sparkles className="h-5 w-5" />,
    title: 'Export-ready',
    body: 'SVG, PNG @1x/@2x/@3x, PDF, and a bulk kit ZIP.',
  },
];

export function ToolLanding({
  meta,
  onLaunch,
  samples,
  features = DEFAULT_FEATURES,
}: ToolLandingProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Set page title + meta description for SEO. The build prerender step
  // (when added) will hydrate these statically; the runtime fallback keeps
  // SPA navigations correct.
  useEffect(() => {
    const prevTitle = document.title;
    document.title = meta.seo.title;
    let descTag = document.querySelector('meta[name="description"]');
    const prevDesc = descTag?.getAttribute('content') ?? null;
    if (!descTag) {
      descTag = document.createElement('meta');
      descTag.setAttribute('name', 'description');
      document.head.appendChild(descTag);
    }
    descTag.setAttribute('content', meta.seo.description);
    return () => {
      document.title = prevTitle;
      if (descTag && prevDesc !== null) descTag.setAttribute('content', prevDesc);
    };
  }, [meta]);

  const handleFile = useCallback(
    (file: File) => {
      onLaunch({ kind: 'file', file });
    },
    [onLaunch],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const Icon = meta.Icon;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      {/* Top nav */}
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <a href="/" className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" />
            BrandOS
          </a>
          <nav className="flex items-center gap-2 text-sm">
            <a href="/tools" className="text-muted-foreground hover:text-foreground">
              Tools
            </a>
            <Button variant="ghost" size="sm" onClick={() => (window.location.href = '/?signin=1')}>
              Sign in
            </Button>
            <Button size="sm" onClick={() => (window.location.href = '/?signup=1')}>
              Sign up free
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 pt-16 pb-10 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          {meta.tagline}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
          {meta.description}
        </p>

        {/* Upload card */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={cn(
            'mx-auto mt-10 flex max-w-xl cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-card/60 p-10 transition-all',
            dragActive
              ? 'border-primary bg-primary/5 ring-4 ring-primary/10'
              : 'border-border hover:border-primary/60 hover:bg-card',
          )}
          onClick={() => fileInput.current?.click()}
        >
          <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-base font-medium">Drop your logo here</p>
          <p className="mt-1 text-sm text-muted-foreground">
            SVG, PNG, JPG · or click to browse
          </p>
          <input
            ref={fileInput}
            type="file"
            accept="image/svg+xml,image/png,image/jpeg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>

        {samples && samples.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>or try a sample:</span>
            {samples.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onLaunch({ kind: 'sample', sampleId: s.id })}
                className="rounded-full border bg-background px-3 py-1 font-medium text-foreground hover:bg-muted"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          Free to use · No signup required to start
        </p>
      </section>

      {/* Feature row */}
      <section className="mx-auto max-w-5xl px-4 pb-20">
        <div className="grid gap-6 sm:grid-cols-3">
          {features.map((f, i) => (
            <div key={i} className="rounded-xl border bg-card p-5">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {f.icon}
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t bg-background py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-xs text-muted-foreground sm:flex-row">
          <span>Made with BrandOS · A free tool from the BrandOS suite</span>
          <a href="/tools" className="hover:text-foreground">
            See all tools →
          </a>
        </div>
      </footer>
    </div>
  );
}
