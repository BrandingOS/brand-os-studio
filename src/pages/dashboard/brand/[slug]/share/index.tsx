/**
 * Share — outbox for the brand.
 *
 * Public showcase, embed code, brand portal, logo deck, guidelines
 * export, and visibility controls.
 */
import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { useBrandStore } from '@/shared/store/brandStore';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Globe, Presentation, Download, Link2, Copy, Share2, Code,
  QrCode, Eye, EyeOff, ExternalLink, Lock, Unlock,
} from 'lucide-react';
import { useBrandPageConfig } from '@/shared/layouts/brandPageConfig';
import { useActiveAnchor, type InnerNavConfig } from '@/shared/layouts/InnerNavRail';
import { activityService } from '@/shared/services/activityService';

const SHARE_ANCHORS = ['visibility', 'showcase', 'embed', 'portal', 'logo-deck', 'guidelines-export'];

export default function SharePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { brand, isLoading, error } = useBrandBySlug(slug);
  const { update } = useBrandStore();
  const [toggling, setToggling] = useState(false);

  const showcaseUrl = `${window.location.origin}/brand/${slug}/showcase`;
  const portalUrl = `${window.location.origin}/p/${slug}`;
  const activeAnchor = useActiveAnchor(SHARE_ANCHORS);

  const embedCode = `<iframe src="${showcaseUrl}" width="100%" height="800" frameborder="0" style="border:none;border-radius:12px;" title="${brand?.name || 'Brand'} Guidelines"></iframe>`;

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
          { id: 'visibility',        label: 'Visibility',       icon: Eye,          anchor: 'visibility' },
          { id: 'showcase',          label: 'Public showcase',  icon: Globe,        anchor: 'showcase' },
          { id: 'embed',             label: 'Embed code',       icon: Code,         anchor: 'embed' },
          { id: 'portal',            label: 'Brand portal',     icon: ExternalLink, anchor: 'portal' },
          { id: 'logo-deck',         label: 'Logo deck',        icon: Presentation, anchor: 'logo-deck' },
          { id: 'guidelines-export', label: 'Guidelines PDF',   icon: Download,     anchor: 'guidelines-export' },
        ],
      },
    ],
  }), [activeAnchor]);

  useBrandPageConfig({ brandName: brand?.name, innerNav });

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${label} copied`),
      () => toast.error('Could not copy'),
    );
  };

  const togglePublic = async () => {
    if (!brand) return;
    setToggling(true);
    const newState = !brand.isPublic;
    try {
      await update(brand.id, { isPublic: newState });
      toast.success(newState ? 'Brand is now public' : 'Brand is now private');
      activityService.log({
        brandId: brand.id, brandName: brand.name,
        eventType: newState ? 'guideline_published' : 'brand_updated',
        title: newState ? 'Brand made public' : 'Brand made private',
      });
    } catch {
      toast.error('Failed to update visibility');
    } finally {
      setToggling(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>;
  if (error || !brand) return <div className="text-center py-16"><p className="text-muted-foreground">{error || 'Brand not found.'}</p></div>;

  const isPublic = brand.isPublic;

  return (
    <div className="space-y-6">
      <PageHeader compact title="Share" subtitle="Turn this brand into something you can send out — links, decks, and downloads." />

      {/* Visibility Toggle */}
      <Card id="section-visibility" className="scroll-mt-24 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isPublic ? 'bg-gradient-to-br from-emerald-500 to-green-600' : 'bg-gradient-to-br from-zinc-500 to-zinc-600'}`}>
              {isPublic ? <Unlock className="w-5 h-5 text-white" /> : <Lock className="w-5 h-5 text-white" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold">Brand visibility</h3>
                <Badge variant={isPublic ? 'default' : 'secondary'} className="text-[10px]">
                  {isPublic ? 'Public' : 'Private'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isPublic ? 'Anyone with the link can view your brand.' : 'Only you and team members can access this brand.'}
              </p>
            </div>
          </div>
          <Button variant={isPublic ? 'outline' : 'default'} size="sm" onClick={togglePublic} disabled={toggling} className="gap-1.5">
            {isPublic ? <><EyeOff className="h-3.5 w-3.5" />Make Private</> : <><Eye className="h-3.5 w-3.5" />Make Public</>}
          </Button>
        </div>
      </Card>

      {/* Public Showcase */}
      <Card id="section-showcase" className="scroll-mt-24 p-5">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold mb-1">Public showcase</h3>
            <p className="text-sm text-muted-foreground mb-3">A clean, public-facing page that presents this brand's identity.</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border min-w-0">
                <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground truncate">{showcaseUrl}</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => copyText(showcaseUrl, 'Showcase link')} className="gap-2"><Copy className="w-3.5 h-3.5" />Copy</Button>
              <Button size="sm" onClick={() => window.open(`/brand/${slug}/showcase`, '_blank')}>Open</Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Embed Code */}
      <Card id="section-embed" className="scroll-mt-24 p-5">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shrink-0">
            <Code className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold mb-1">Embed code</h3>
            <p className="text-sm text-muted-foreground mb-3">Embed your brand guidelines on any website with an iframe snippet.</p>
            <div className="relative">
              <pre className="rounded-lg bg-muted/50 border border-border p-3 text-xs text-muted-foreground overflow-x-auto font-mono whitespace-pre-wrap break-all">
                {embedCode}
              </pre>
              <Button variant="outline" size="sm" onClick={() => copyText(embedCode, 'Embed code')} className="absolute top-2 right-2 gap-1.5 h-7 text-xs">
                <Copy className="w-3 h-3" />Copy
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Brand Portal */}
      <Card id="section-portal" className="scroll-mt-24 p-5">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shrink-0">
            <ExternalLink className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold mb-1">Brand portal</h3>
            <p className="text-sm text-muted-foreground mb-3">A Frontify-style public portal with hero, colors, typography, and voice.</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border min-w-0">
                <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground truncate">{portalUrl}</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => copyText(portalUrl, 'Portal link')} className="gap-2"><Copy className="w-3.5 h-3.5" />Copy</Button>
              <Button size="sm" onClick={() => window.open(portalUrl, '_blank')}>Open</Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Logo Deck */}
      <Card id="section-logo-deck" className="scroll-mt-24 p-5 cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5" onClick={() => navigate(`/b/${slug}/logo-presentation`)}>
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
            <Presentation className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold mb-1">Logo presentation deck</h3>
            <p className="text-sm text-muted-foreground">Present logo concepts with rationale and color variants.</p>
          </div>
        </div>
      </Card>

      {/* Guidelines Export */}
      <Card id="section-guidelines-export" className="scroll-mt-24 p-5 cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5" onClick={() => navigate(`/b/${slug}/guidelines`)}>
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold mb-1">Brand guidelines export</h3>
            <p className="text-sm text-muted-foreground">Export your full brand guidelines as a PDF or shareable deck.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
