/**
 * TemplateRow — shared horizontal scroll row of template cards used by
 * Stationery, Social, and Mockups sections.
 *
 * Each card shows a brand-tinted preview, the template name, and an Edit
 * button that deep-links to the legacy brandkit module page (which has the
 * full Fabric.js editor).
 */
import * as React from 'react';
import { Link } from 'react-router-dom';
import { Edit3 } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';
import type { BrandKitTemplate } from '@/features/brandkit/types';

interface TemplateRowProps {
  brand: Brand;
  slug: string;
  templates: BrandKitTemplate[];
  /** brandkit module id used for the Edit deep link, e.g. 'business-cards' */
  moduleId: string;
}

const ASPECT_BY_ORIENTATION: Record<string, string> = {
  landscape: 'aspect-[16/9]',
  portrait: 'aspect-[9/16]',
  square: 'aspect-square',
  mixed: 'aspect-[4/3]',
};

export function TemplateRow({ brand, slug, templates, moduleId }: TemplateRowProps) {
  const palettes = React.useMemo(
    () => [
      [brand.primaryColor || '#7c3aed', brand.secondaryColor || '#06b6d4'],
      ['#0a0a0f', brand.primaryColor || '#7c3aed'],
      [brand.secondaryColor || '#06b6d4', '#fafafa'],
      [brand.primaryColor || '#7c3aed', '#fafafa'],
      ['#fafafa', brand.primaryColor || '#7c3aed'],
    ],
    [brand.primaryColor, brand.secondaryColor],
  );

  if (templates.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/30 px-4 py-8 text-center text-xs text-muted-foreground">
        No templates available yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {templates.slice(0, 8).map((tpl, i) => {
        const palette = palettes[i % palettes.length];
        const orientationClass = ASPECT_BY_ORIENTATION[tpl.orientation] ?? 'aspect-[4/3]';
        const isDark = palette[0] === '#0a0a0f' || palette[0] === '#0f0f1a';
        return (
          <Link
            key={tpl.id}
            to={`/b/${slug}/brandkit/${moduleId}`}
            className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_18px_40px_-20px_hsl(var(--primary)/0.4)]"
          >
            <div
              className={`relative ${orientationClass} w-full`}
              style={{
                background: `linear-gradient(135deg, ${palette[0]} 0%, ${palette[1]} 100%)`,
              }}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                <div
                  className="font-display text-xl font-bold tracking-tight"
                  style={{ color: isDark ? '#fff' : palette[1] }}
                >
                  {brand.name}
                </div>
                <div
                  className="mt-1 text-[10px] font-medium opacity-70"
                  style={{ color: isDark ? '#fff' : palette[1] }}
                >
                  {tpl.category}
                </div>
              </div>
            </div>
            <div className="border-t border-border p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-foreground">{tpl.name}</div>
                  <div className="text-[10px] text-muted-foreground">{tpl.category}</div>
                </div>
                <span className="inline-flex items-center justify-center rounded-md border border-border bg-background p-1 text-muted-foreground transition group-hover:border-primary/40 group-hover:text-foreground">
                  <Edit3 className="h-3 w-3" />
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
