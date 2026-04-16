import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useLogoMakerStore } from '../state/useLogoMakerStore';
import { buildContext, DEFAULT_PALETTE } from '../utils/brand-context';
import { downloadBrandKit } from '../utils/download-all';
import { LogoVariationsCard } from '../components/brand-kit/LogoVariationsCard';
import { ColorPaletteCard } from '../components/brand-kit/ColorPaletteCard';
import { TypographyCard } from '../components/brand-kit/TypographyCard';
import { SocialProfilesCard } from '../components/brand-kit/SocialProfilesCard';
import { MockupsCard, MockupsFullGallery } from '../components/brand-kit/MockupsCard';
import { GuidelinesCard } from '../components/brand-kit/GuidelinesCard';

export default function BrandKitScreen() {
  const navigate = useNavigate();
  const { logoId = 'blank' } = useParams();
  const brief = useLogoMakerStore((s) => s.brief);
  const editedSVG = useLogoMakerStore((s) => s.editedSVG);
  const setScreen = useLogoMakerStore((s) => s.setScreen);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => setScreen(5), [setScreen]);

  const ctx = useMemo(
    () => buildContext(brief, editedSVG, DEFAULT_PALETTE),
    [brief, editedSVG],
  );

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadBrandKit({ ctx, palette: DEFAULT_PALETTE, editedSVG });
      toast.success('Brand kit downloaded.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed.');
    } finally {
      setDownloading(false);
    }
  };

  const goRegister = () => navigate(`/logo-maker/complete/${logoId}`);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between px-6 py-3 gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/logo-maker/editor/${logoId}`)}
            className="gap-2 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Editor
          </Button>
          <div className="flex-1 min-w-0 text-center">
            <h1 className="text-base font-semibold truncate">
              {ctx.brandName} brand kit
            </h1>
            <p className="text-[11px] text-muted-foreground">Step 5 of 6</p>
          </div>
          <Button onClick={handleDownload} disabled={downloading} className="gap-2 shrink-0">
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download all (.zip)
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-[1200px] mx-auto w-full px-6 py-8 space-y-10">
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <LogoVariationsCard ctx={ctx} />
          <ColorPaletteCard palette={DEFAULT_PALETTE} />
          <TypographyCard />
          <SocialProfilesCard ctx={ctx} />
          <MockupsCard ctx={ctx} />
          <GuidelinesCard ctx={ctx} />
        </section>

        <section>
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">All mockups</h2>
              <p className="text-xs text-muted-foreground">
                12 real-world scenes — every template in the registry.
              </p>
            </div>
          </div>
          <MockupsFullGallery ctx={ctx} />
        </section>
      </main>

      <footer className="sticky bottom-0 bg-background/80 backdrop-blur border-t border-border">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between px-6 py-4">
          <Button
            variant="ghost"
            asChild
            className="gap-2"
          >
            <Link to={`/logo-maker/editor/${logoId}`}>
              <ArrowLeft className="w-4 h-4" />
              Back to editor
            </Link>
          </Button>
          <Button onClick={goRegister} className="gap-2">
            Save & register brand
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
