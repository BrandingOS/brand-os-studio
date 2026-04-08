/**
 * Share — outbox for the brand.
 *
 * Brings together everything that turns the brand into something shareable:
 * the public showcase link, the logo presentation deck, and per-asset
 * exports. See docs/ux-redesign/ARCHITECTURE.md §3.1 (Share section).
 *
 * Stage 11 will deepen this with batch export, link sharing, and
 * collaboration controls.
 */
import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Globe,
  Presentation,
  Download,
  Link2,
  Copy,
  Share2,
} from 'lucide-react';
import { useBrandPageConfig } from '@/shared/layouts/brandPageConfig';
import { useActiveAnchor, type InnerNavConfig } from '@/shared/layouts/InnerNavRail';

const SHARE_ANCHORS = ['showcase', 'logo-deck', 'guidelines-export'];

export default function SharePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { brand, isLoading, error } = useBrandBySlug(slug);

  const showcaseUrl = `${window.location.origin}/brand/${slug}/showcase`;
  const activeAnchor = useActiveAnchor(SHARE_ANCHORS);

  const innerNav = useMemo<InnerNavConfig>(() => ({
    title: 'Share',
    icon: Share2,
    storageKey: 'brandos:share-nav-open',
    activeAnchor,
    groups: [
      {
        id: 'sections',
        label: 'On this page',
        items: [
          { id: 'showcase',          label: 'Public showcase', icon: Globe,        anchor: 'showcase' },
          { id: 'logo-deck',         label: 'Logo deck',        icon: Presentation, anchor: 'logo-deck' },
          { id: 'guidelines-export', label: 'Guidelines PDF',   icon: Download,     anchor: 'guidelines-export' },
        ],
      },
    ],
  }), [activeAnchor]);

  useBrandPageConfig({ brandName: brand?.name, innerNav });

  const handleCopyShowcase = () => {
    navigator.clipboard.writeText(showcaseUrl).then(
      () => toast.success('Showcase link copied'),
      () => toast.error('Could not copy link'),
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !brand) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">{error || 'Brand not found.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
        <PageHeader
          compact
          title="Share"
          subtitle="Turn this brand into something you can send out — links, decks, and downloads."
        />

        {/* Public showcase link — shipped feature, surface it. */}
        <Card id="section-showcase" className="scroll-mt-24 p-5">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold mb-1">Public showcase</h3>
              <p className="text-sm text-muted-foreground mb-3">
                A clean, public-facing page that presents this brand's identity.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border min-w-0">
                  <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground truncate">{showcaseUrl}</span>
                </div>
                <Button variant="outline" size="sm" onClick={handleCopyShowcase} className="gap-2">
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </Button>
                <Button
                  size="sm"
                  onClick={() => window.open(`/brand/${slug}/showcase`, '_blank')}
                >
                  Open
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Logo presentation — exists today as standalone, surface it here. */}
        <Card
          id="section-logo-deck"
          className="scroll-mt-24 p-5 cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5"
          onClick={() => navigate(`/dashboard/brand/${slug}/logo-presentation`)}
        >
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
              <Presentation className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold mb-1">Logo presentation deck</h3>
              <p className="text-sm text-muted-foreground">
                Present 3–5 logo concepts to a client, with rationale and color variants.
              </p>
            </div>
          </div>
        </Card>

        {/* Brand book / guidelines export. */}
        <Card
          id="section-guidelines-export"
          className="scroll-mt-24 p-5 cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5"
          onClick={() => navigate(`/dashboard/brand/${slug}/guidelines`)}
        >
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold mb-1">Brand guidelines export</h3>
              <p className="text-sm text-muted-foreground">
                Export your full brand guidelines as a PDF or shareable deck.
              </p>
            </div>
          </div>
        </Card>
    </div>
  );
}
