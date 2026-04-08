/**
 * FaviconSection — generates 16/32/48/64/128/256/512 PNGs + .ico from
 * the brand's icon (or full logo if no icon set), with per-size download.
 */
import * as React from 'react';
import { Link } from 'react-router-dom';
import { Edit3, Download, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { Brand } from '@/shared/types/brand';
import { generateFavicons, generateIcoFromFavicons, type FaviconAsset } from '../favicon';
import { downloadBlob } from '../downloaders';
import { SectionHeader } from '../SectionHeader';

interface FaviconSectionProps {
  brand: Brand;
  slug: string;
}

export function FaviconSection({ brand, slug }: FaviconSectionProps) {
  const source = brand.logoAssets?.icon || brand.logo;
  const [favicons, setFavicons] = React.useState<FaviconAsset[] | null>(null);
  const [generating, setGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    if (!source) return;
    setGenerating(true);
    setError(null);
    generateFavicons(source)
      .then((result) => {
        if (!cancelled) setFavicons(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to generate favicons');
      })
      .finally(() => {
        if (!cancelled) setGenerating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [source]);

  const handleDownload = (f: FaviconAsset) => {
    downloadBlob(f.blob, `favicon-${f.size}.png`);
    toast.success(`Downloaded favicon-${f.size}.png`);
  };

  const handleDownloadIco = async () => {
    if (!favicons) return;
    const ico = await generateIcoFromFavicons(favicons);
    if (ico) {
      downloadBlob(ico, 'favicon.ico');
      toast.success('Downloaded favicon.ico');
    } else {
      toast.error('Could not build favicon.ico');
    }
  };

  return (
    <section>
      <SectionHeader
        eyebrow="Identity"
        title="Favicons & app icons"
        subtitle="Multi-size icons generated from your logo for browsers, app stores, and PWAs."
        count={favicons?.length ?? 0}
        action={
          <Link
            to={`/b/${slug}/identity?tab=logo`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:border-primary/40"
          >
            <Edit3 className="h-3 w-3" />
            Edit icon
          </Link>
        }
      />

      {!source ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/30 px-6 py-12 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Add a logo to generate favicons automatically.</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 px-6 py-8 text-center text-sm text-red-400">
          {error}
        </div>
      ) : generating || !favicons ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/30 px-6 py-12 text-center text-sm text-muted-foreground">
          Generating favicons…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {favicons.map((f) => (
              <button
                key={f.size}
                type="button"
                onClick={() => handleDownload(f)}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3 text-center transition hover:-translate-y-0.5 hover:border-primary/40"
              >
                <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-border bg-background p-2">
                  <img
                    src={f.dataUrl}
                    alt={`favicon-${f.size}`}
                    style={{ width: Math.min(f.size, 48), height: Math.min(f.size, 48) }}
                    className="object-contain"
                  />
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">{f.size}px</div>
                  <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Download className="h-2.5 w-2.5" />
                    PNG
                  </div>
                </div>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleDownloadIco}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:border-primary/40"
          >
            <Download className="h-3 w-3" />
            Download favicon.ico
          </button>
        </>
      )}
    </section>
  );
}
