/**
 * TypographySection — primary + secondary font cards with type scale
 * specimen and link to edit.
 */
import * as React from 'react';
import { Link } from 'react-router-dom';
import { Edit3, Type } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';
import { SectionHeader } from '../SectionHeader';

interface TypographySectionProps {
  brand: Brand;
  slug: string;
}

const SCALE = [
  { label: 'Display · 64', size: 64, sample: 'Aa' },
  { label: 'H1 · 48', size: 48, sample: 'The brand speaks' },
  { label: 'H2 · 32', size: 32, sample: 'A clear voice' },
  { label: 'H3 · 22', size: 22, sample: 'Sub-section' },
  { label: 'Body · 16', size: 16, sample: 'The quick brown fox jumps over the lazy dog.' },
  { label: 'Caption · 12', size: 12, sample: 'CAPTION · UPPERCASE TRACKING' },
];

export function TypographySection({ brand, slug }: TypographySectionProps) {
  const primary = brand.fonts?.primary || 'Inter';
  const secondary = brand.fonts?.secondary;

  return (
    <section>
      <SectionHeader
        eyebrow="Identity"
        title="Typography"
        subtitle="The type system that carries the brand voice."
        action={
          <Link
            to={`/b/${slug}/identity?tab=typography`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:border-primary/40"
          >
            <Edit3 className="h-3 w-3" />
            Swap fonts
          </Link>
        }
      />

      <div className="grid gap-3 lg:grid-cols-2">
        {/* Primary */}
        <article className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Primary
            </span>
            <Type className="h-3 w-3 text-muted-foreground" />
          </div>
          <div
            className="mt-3 font-bold leading-none text-foreground"
            style={{ fontFamily: primary, fontSize: 'min(14vw, 120px)' }}
          >
            Aa
          </div>
          <div className="mt-4 text-base font-semibold text-foreground" style={{ fontFamily: primary }}>
            {primary}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">Headlines, display, brand wordmark</div>
        </article>

        {/* Secondary */}
        <article className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Secondary
            </span>
            <Type className="h-3 w-3 text-muted-foreground" />
          </div>
          <div
            className="mt-3 font-normal leading-none text-foreground"
            style={{ fontFamily: secondary || primary, fontSize: 'min(14vw, 120px)' }}
          >
            Aa
          </div>
          <div className="mt-4 text-base font-semibold text-foreground" style={{ fontFamily: secondary || primary }}>
            {secondary || primary}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {secondary ? 'Body copy, long-form, UI labels' : 'No secondary font set'}
          </div>
        </article>
      </div>

      {/* Type scale specimen */}
      <div className="mt-4 rounded-2xl border border-border bg-card p-6">
        <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Type scale
        </h3>
        <ul className="space-y-3" style={{ fontFamily: primary }}>
          {SCALE.map((row) => (
            <li key={row.label} className="flex items-baseline justify-between gap-6 border-b border-border/50 pb-2 last:border-0">
              <span
                className="truncate text-foreground"
                style={{
                  fontSize: `${row.size}px`,
                  lineHeight: 1.1,
                  fontWeight: row.size >= 32 ? 700 : row.size >= 16 ? 500 : 400,
                  letterSpacing: row.size <= 12 ? '0.08em' : row.size >= 32 ? '-0.02em' : '0',
                  textTransform: row.size <= 12 ? 'uppercase' : undefined,
                }}
              >
                {row.sample}
              </span>
              <span className="flex-shrink-0 text-[10px] text-muted-foreground">{row.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
