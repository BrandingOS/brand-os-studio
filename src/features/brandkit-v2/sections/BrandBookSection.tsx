/**
 * BrandBookSection — preview the auto-generated brand guide PDF and let
 * the user download it. Also surfaces a deep link into the existing block
 * builder for richer customization.
 */
import * as React from 'react';
import { Link } from 'react-router-dom';
import { Download, BookOpen, Layers, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Brand } from '@/shared/types/brand';
import { logoUrl } from '@/shared/brand/logoUrl';
import { generateBrandGuidePdf } from '../brandGuidePdf';
import { downloadBlob } from '../downloaders';
import { SectionHeader } from '../SectionHeader';

interface BrandBookSectionProps {
  brand: Brand;
  slug: string;
}

export function BrandBookSection({ brand, slug }: BrandBookSectionProps) {
  const [downloading, setDownloading] = React.useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    const id = toast.loading('Generating brand guide…');
    try {
      const blob = await generateBrandGuidePdf(brand);
      downloadBlob(blob, `${brand.slug || 'brand'}-brand-guide.pdf`);
      toast.success('Brand guide downloaded', { id });
    } catch (err) {
      console.error(err);
      toast.error('Could not generate brand guide', { id });
    } finally {
      setDownloading(false);
    }
  };

  const primary = brand.primaryColor || '#7c3aed';

  return (
    <section>
      <SectionHeader
        eyebrow="Documentation"
        title="Brand book"
        subtitle="A 4-page PDF that summarizes everything: cover, logo, color & type, voice."
        action={
          <Link
            to={`/b/${slug}/guidelines/blocks`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:border-primary/40"
          >
            <Layers className="h-3 w-3" />
            Open block builder
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-[1fr_200px]">
        {/* Mock cover preview */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="grid grid-cols-2">
            <div
              className="flex aspect-[3/4] flex-col items-center justify-center p-8 text-center"
              style={{ backgroundColor: primary }}
            >
              {logoUrl(brand) ? (
                <img src={logoUrl(brand)} alt={brand.name} className="mb-6 max-h-16 max-w-[60%] object-contain" />
              ) : null}
              <h3 className="font-display text-3xl font-bold leading-tight text-white">{brand.name}</h3>
              <p className="mt-2 text-xs text-white/80">{brand.tone}</p>
            </div>
            <div className="flex aspect-[3/4] flex-col gap-3 p-6">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Page 2 · Logo
              </div>
              <div className="flex h-16 items-center justify-center rounded-md bg-muted/30">
                {logoUrl(brand) && <img src={logoUrl(brand)} alt="" className="max-h-10 max-w-[80%] object-contain" />}
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Page 3 · Color
              </div>
              <div className="flex gap-1">
                <div className="h-6 flex-1 rounded" style={{ backgroundColor: primary }} />
                {brand.secondaryColor && (
                  <div className="h-6 flex-1 rounded" style={{ backgroundColor: brand.secondaryColor }} />
                )}
                <div className="h-6 flex-1 rounded bg-foreground" />
                <div className="h-6 flex-1 rounded border border-border bg-background" />
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Page 4 · Voice
              </div>
              <div className="text-[10px] leading-relaxed text-muted-foreground">{brand.audience}</div>
            </div>
          </div>
        </div>

        <aside className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5">
          <div>
            <BookOpen className="h-5 w-5 text-primary" />
            <h3 className="mt-3 text-sm font-semibold text-foreground">{brand.name} brand guide</h3>
            <p className="mt-1 text-[11px] text-muted-foreground">4 pages · Auto-generated · A4 PDF</p>
          </div>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {downloading ? 'Generating…' : 'Download PDF'}
          </button>
        </aside>
      </div>
    </section>
  );
}
