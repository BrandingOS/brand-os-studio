/**
 * LogoSection — renders all logo variants with per-variant download.
 *
 * Reuses `generateLogoVariants(brand)` from `src/shared/color/brandRules.ts`
 * (the same engine LogoFilesModule uses) so variants stay consistent across
 * Brand Kit v2 and the legacy logo-files module.
 */
import * as React from 'react';
import { Link } from 'react-router-dom';
import { Edit3, Download, Sparkles } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';
import { generateLogoVariants, type LogoVariant } from '@/shared/color/brandRules';
import { SectionHeader } from '../SectionHeader';
import { DownloadDialog, type DownloadFormat } from '../DownloadDialog';
import { rasterizeLogoVariant, downloadBlob, fetchSvgIfPossible, buildLogoPdf } from '../downloaders';

interface LogoSectionProps {
  brand: Brand;
  slug: string;
}

export function LogoSection({ brand, slug }: LogoSectionProps) {
  const variants = React.useMemo(() => generateLogoVariants(brand), [brand]);
  const [active, setActive] = React.useState<LogoVariant | null>(null);

  const handleExport = async (variant: LogoVariant, format: DownloadFormat, sizePx?: number) => {
    const filenameBase = `${slug}-${variant.id}`;
    if (format === 'svg') {
      const svgText = await fetchSvgIfPossible(variant.logoSrc);
      if (!svgText) throw new Error('No SVG source available for this variant');
      downloadBlob(new Blob([svgText], { type: 'image/svg+xml' }), `${filenameBase}.svg`);
      return;
    }
    if (format === 'pdf') {
      const pdfBlob = await buildLogoPdf(variant, brand);
      downloadBlob(pdfBlob, `${filenameBase}.pdf`);
      return;
    }
    // png / jpg
    const blob = await rasterizeLogoVariant(variant, sizePx ?? 1000);
    downloadBlob(blob, `${filenameBase}-${sizePx ?? 1000}.${format}`);
  };

  if (variants.length === 0) {
    return (
      <section>
        <SectionHeader
          eyebrow="Identity"
          title="Logo"
          subtitle="Upload a logo to see all variants generated automatically."
          action={
            <Link
              to={`/b/${slug}/identity?tab=logo`}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:border-primary/40"
            >
              <Edit3 className="h-3 w-3" />
              Add a logo
            </Link>
          }
        />
        <div className="rounded-2xl border border-dashed border-border bg-card/30 px-6 py-12 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">
            No logo yet. Once added, BrandOS will generate {8} variants automatically.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <SectionHeader
        eyebrow="Identity"
        title="Logo"
        subtitle="Variants for every context — color, inverse, monochrome."
        count={variants.length}
        action={
          <Link
            to={`/b/${slug}/identity?tab=logo`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:border-primary/40"
          >
            <Edit3 className="h-3 w-3" />
            Edit logo
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {variants.map((v) => (
          <article
            key={v.id}
            className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_20px_50px_-20px_hsl(var(--primary)/0.4)]"
          >
            <div
              className="flex aspect-[4/3] items-center justify-center p-6"
              style={{ backgroundColor: v.bgColor === 'transparent' ? 'transparent' : v.bgColor }}
            >
              {v.logoSrc ? (
                <img
                  src={v.logoSrc}
                  alt={v.name}
                  className="max-h-full max-w-full object-contain"
                  style={{ filter: v.logoFilter }}
                />
              ) : (
                <span className="text-xs text-muted-foreground">No source</span>
              )}
            </div>
            <div className="border-t border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">{v.name}</div>
                  <div className="text-[10px] capitalize text-muted-foreground">{v.category}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setActive(v)}
                  className="inline-flex flex-shrink-0 items-center justify-center rounded-md border border-border bg-card p-1.5 text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                  aria-label="Download"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {active && (
        <DownloadDialog
          open={true}
          onClose={() => setActive(null)}
          title={`Download · ${active.name}`}
          subtitle={active.recommendedUse}
          formats={['png', 'svg', 'pdf']}
          onExport={(format, sizePx) => handleExport(active, format, sizePx)}
        />
      )}
    </section>
  );
}
