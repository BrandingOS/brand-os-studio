/**
 * BlockRenderer — renders any Block to React. Pure read view.
 * Edit affordances live in the BlocksEditor wrapper.
 */
import * as React from 'react';
import { Download, Info, AlertTriangle, CheckCircle2, AlertCircle, X } from 'lucide-react';
import type { Block } from './types';
import { cn } from '@/lib/utils';

const CALLOUT_STYLES: Record<string, { icon: typeof Info; ring: string; bg: string; text: string }> = {
  info: { icon: Info, ring: 'border-blue-500/30', bg: 'bg-blue-500/10', text: 'text-blue-400' },
  success: { icon: CheckCircle2, ring: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  warning: { icon: AlertTriangle, ring: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  danger: { icon: AlertCircle, ring: 'border-red-500/30', bg: 'bg-red-500/10', text: 'text-red-400' },
};

export function BlockRenderer({ block }: { block: Block }) {
  switch (block.type) {
    case 'heading': {
      const Tag = (`h${block.level}` as 'h1' | 'h2' | 'h3');
      const sizeClass =
        block.level === 1
          ? 'font-display text-4xl md:text-5xl font-bold tracking-[-0.02em]'
          : block.level === 2
            ? 'font-display text-2xl md:text-3xl font-bold tracking-[-0.01em]'
            : 'font-display text-lg md:text-xl font-semibold';
      return <Tag className={cn(sizeClass, 'text-foreground')}>{block.text}</Tag>;
    }

    case 'paragraph':
      return <p className="text-base leading-relaxed text-muted-foreground">{block.text}</p>;

    case 'quote':
      return (
        <blockquote className="border-l-2 border-primary pl-5 py-1">
          <p className="font-display text-xl italic text-foreground">&ldquo;{block.text}&rdquo;</p>
          {block.author && <footer className="mt-2 text-xs text-muted-foreground">— {block.author}</footer>}
        </blockquote>
      );

    case 'divider':
      if (block.variant === 'space-sm') return <div className="h-4" />;
      if (block.variant === 'space-lg') return <div className="h-12" />;
      return <hr className="border-border" />;

    case 'image': {
      const layout = block.layout ?? 'contained';
      return (
        <figure className={cn(layout === 'full' && '-mx-4 md:-mx-8')}>
          <div
            className={cn(
              'overflow-hidden',
              layout === 'framed' && 'rounded-2xl border border-border bg-card p-2',
              layout !== 'framed' && 'rounded-2xl',
            )}
          >
            <img src={block.url} alt={block.caption ?? ''} className="w-full" />
          </div>
          {block.caption && <figcaption className="mt-2 text-xs text-muted-foreground">{block.caption}</figcaption>}
        </figure>
      );
    }

    case 'image-grid':
      return (
        <div
          className={cn(
            'grid gap-3',
            block.columns === 2 && 'grid-cols-2',
            block.columns === 3 && 'grid-cols-2 md:grid-cols-3',
            block.columns === 4 && 'grid-cols-2 md:grid-cols-4',
            !block.columns && 'grid-cols-2 md:grid-cols-3',
          )}
        >
          {block.images.map((img, i) => (
            <figure key={i} className="overflow-hidden rounded-xl border border-border bg-card">
              <img src={img.url} alt={img.caption ?? ''} className="aspect-[4/3] w-full object-cover" />
            </figure>
          ))}
        </div>
      );

    case 'color-swatch':
      return (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="aspect-[16/9] w-full" style={{ backgroundColor: block.hex }} />
          <div className="flex items-center justify-between p-4">
            <div>
              {block.name && <div className="text-sm font-semibold text-foreground">{block.name}</div>}
              <div className="font-mono text-xs text-muted-foreground">{block.hex.toUpperCase()}</div>
            </div>
            {block.usage && <div className="max-w-[60%] text-right text-xs text-muted-foreground">{block.usage}</div>}
          </div>
        </div>
      );

    case 'color-palette':
      return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {block.swatches.map((s, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="aspect-[5/3] w-full" style={{ backgroundColor: s.hex }} />
              <div className="p-3">
                {s.name && <div className="text-xs font-semibold text-foreground">{s.name}</div>}
                <div className="font-mono text-[10px] text-muted-foreground">{s.hex.toUpperCase()}</div>
              </div>
            </div>
          ))}
        </div>
      );

    case 'type-specimen':
      return (
        <div className="rounded-2xl border border-border bg-card p-8" style={{ fontFamily: block.fontFamily }}>
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {block.fontFamily}
          </div>
          <div className="mt-2 font-bold leading-none text-foreground" style={{ fontSize: 'min(20vw, 220px)' }}>
            {block.sampleText ?? 'Aa'}
          </div>
          {block.weights && (
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
              {block.weights.map((w) => (
                <span key={w} style={{ fontWeight: w }}>
                  {w}
                </span>
              ))}
            </div>
          )}
        </div>
      );

    case 'logo-card':
      return (
        <div className="overflow-hidden rounded-2xl border border-border">
          <div
            className="flex aspect-[16/9] items-center justify-center p-12"
            style={{ backgroundColor: block.background ?? '#fafafa' }}
          >
            {block.logoUrl ? (
              <img src={block.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
            ) : (
              <div className="text-xs text-muted-foreground">No logo provided</div>
            )}
          </div>
          {block.caption && <div className="border-t border-border bg-card p-4 text-xs text-muted-foreground">{block.caption}</div>}
        </div>
      );

    case 'do-dont':
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
            <div className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              Do
            </div>
            <p className="text-sm text-foreground">{block.do.text}</p>
          </div>
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
            <div className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-red-400">
              <X className="h-3 w-3" />
              Don't
            </div>
            <p className="text-sm text-foreground">{block.dont.text}</p>
          </div>
        </div>
      );

    case 'video':
      return (
        <figure>
          <div className="aspect-video overflow-hidden rounded-2xl border border-border bg-black">
            <iframe
              src={block.src}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={block.caption ?? 'Video'}
            />
          </div>
          {block.caption && <figcaption className="mt-2 text-xs text-muted-foreground">{block.caption}</figcaption>}
        </figure>
      );

    case 'code':
      return (
        <div className="overflow-hidden rounded-2xl border border-border bg-muted/30">
          <div className="flex items-center justify-between border-b border-border px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>{block.language ?? 'code'}</span>
          </div>
          <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-foreground">{block.code}</pre>
        </div>
      );

    case 'download':
      return (
        <a
          href={block.url}
          className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/40"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-foreground">{block.label}</div>
            <div className="text-[11px] text-muted-foreground">
              {block.format} {block.fileSize && `· ${block.fileSize}`}
            </div>
          </div>
          <Download className="h-4 w-4 text-muted-foreground transition group-hover:text-foreground" />
        </a>
      );

    case 'callout': {
      const styles = CALLOUT_STYLES[block.variant];
      const Icon = styles.icon;
      return (
        <div className={cn('flex items-start gap-3 rounded-2xl border p-5', styles.ring, styles.bg)}>
          <Icon className={cn('mt-0.5 h-4 w-4 flex-shrink-0', styles.text)} />
          <div className="flex-1">
            {block.title && <div className="mb-1 text-sm font-semibold text-foreground">{block.title}</div>}
            <p className="text-sm text-muted-foreground">{block.text}</p>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}
