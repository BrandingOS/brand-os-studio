/**
 * BrandKitPage — the unified Brand Kit v2 surface.
 *
 * Mounted at /b/:slug/kit (and /dashboard/brand/:slug/kit).
 *
 * Composes 8 sections (Logo · Colors · Typography · Stationery · Social ·
 * Favicon · Mockups · Brand Book) under a sticky topbar with the bulk
 * "Download brand kit (.zip)" CTA.
 *
 * v5 sprint-3 / Brand Kit v2.
 */
import * as React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Edit3, Share2, Download, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { BrandLayout } from '@/features/brand/components/BrandLayout';
import { useBrandStore } from '@/shared/store/brandStore';
import { exportBrandKitZip } from './bulkExport';
import { downloadBlob } from './downloaders';
import { LogoSection } from './sections/LogoSection';
import { ColorsSection } from './sections/ColorsSection';
import { TypographySection } from './sections/TypographySection';
import { StationerySection } from './sections/StationerySection';
import { SocialSection } from './sections/SocialSection';
import { FaviconSection } from './sections/FaviconSection';
import { MockupsSection } from './sections/MockupsSection';
import { BrandBookSection } from './sections/BrandBookSection';

export default function BrandKitPage() {
  const { slug } = useParams<{ slug: string }>();
  const { current, loadBySlug } = useBrandStore();
  const [exporting, setExporting] = React.useState(false);
  const [progress, setProgress] = React.useState<{ pct: number; label: string }>({ pct: 0, label: '' });

  React.useEffect(() => {
    if (slug) loadBySlug(slug);
  }, [slug, loadBySlug]);

  const completeness = React.useMemo(() => {
    if (!current) return 0;
    const checks = [
      !!(current.logo || current.logoAssets?.full),
      !!current.primaryColor,
      !!current.secondaryColor,
      !!current.tone && current.tone.length > 3,
      !!current.audience && current.audience.length > 3,
      !!current.fonts?.primary,
      (current.assets?.length ?? 0) >= 3,
      !!current.guidelines?.strategy?.mission,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [current]);

  const handleBulkExport = async () => {
    if (!current) return;
    setExporting(true);
    setProgress({ pct: 0, label: 'Starting…' });
    const id = toast.loading('Building brand kit ZIP…');
    try {
      const blob = await exportBrandKitZip(current, (p) => {
        setProgress(p);
        toast.loading(`${p.label} (${p.pct}%)`, { id });
      });
      const filename = `${current.slug || 'brand'}-brand-kit.zip`;
      downloadBlob(blob, filename);
      toast.success(`Brand kit downloaded · ${filename}`, { id });
    } catch (err) {
      console.error('[BrandKitPage] bulk export failed', err);
      toast.error(`Bulk export failed · ${err instanceof Error ? err.message : 'unknown'}`, { id });
    } finally {
      setExporting(false);
      setProgress({ pct: 0, label: '' });
    }
  };

  if (!current || !slug) {
    return (
      <BrandLayout>
        <div className="p-8 text-sm text-muted-foreground">Loading brand kit…</div>
      </BrandLayout>
    );
  }

  return (
    <BrandLayout maxWidth="7xl">
      {/* Sticky topbar */}
      <div className="sticky top-0 z-20 -mx-4 mb-8 border-b border-border bg-background/85 px-4 py-4 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {current.logo ? (
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-background p-1.5">
                <img src={current.logo} alt={current.name} className="max-h-full max-w-full object-contain" />
              </div>
            ) : (
              <div
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-base font-bold text-white"
                style={{ backgroundColor: current.primaryColor || '#7c3aed' }}
              >
                {current.name?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Brand Kit</p>
              <h1 className="truncate font-display text-2xl font-bold tracking-[-0.02em] text-foreground">
                {current.name}
              </h1>
            </div>
            <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-[10px] font-semibold text-foreground">
              <Sparkles className="h-2.5 w-2.5 text-primary" />
              {completeness}% complete
            </span>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            <Link
              to={`/b/${slug}/identity`}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:border-primary/40"
            >
              <Edit3 className="h-3 w-3" />
              Edit brand
            </Link>
            <Link
              to={`/p/${slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:border-primary/40"
            >
              <Share2 className="h-3 w-3" />
              Share portal
            </Link>
            <button
              type="button"
              onClick={handleBulkExport}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.7)] transition hover:opacity-95 disabled:opacity-60"
            >
              {exporting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {progress.pct}% · {progress.label}
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  Download brand kit (.zip)
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-14 pb-12">
        <LogoSection brand={current} slug={slug} />
        <ColorsSection brand={current} slug={slug} />
        <TypographySection brand={current} slug={slug} />
        <StationerySection brand={current} slug={slug} />
        <SocialSection brand={current} slug={slug} />
        <FaviconSection brand={current} slug={slug} />
        <MockupsSection brand={current} slug={slug} />
        <BrandBookSection brand={current} slug={slug} />
      </div>
    </BrandLayout>
  );
}
