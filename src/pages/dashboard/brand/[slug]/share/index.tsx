/**
 * Share — outbox for the brand.
 *
 * Tabs:
 *   - Guidelines → publishable guidelines (read/export + deep links into the editors)
 *   - Showcase   → public link, embed, brand portal
 *   - Exports    → logo deck, guidelines PDF, visibility controls
 *
 * Active tab persists to `?tab=`; default `guidelines`.
 */
import { useCallback, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { useBrandStore } from '@/shared/store/brandStore';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Globe, Presentation, Download, Link2, Copy, Share2, Code,
  Eye, EyeOff, ExternalLink, Lock, Unlock, BookOpen, FileText,
  Edit,
} from 'lucide-react';
import { useBrandPageConfig } from '@/shared/layouts/brandPageConfig';
import type { InnerNavConfig } from '@/shared/layouts/InnerNavRail';
import { activityService } from '@/shared/services/activityService';
import { useBrandSettings } from '@/shared/brand-settings';

type TabId = 'guidelines' | 'showcase' | 'exports';
const TABS: TabId[] = ['guidelines', 'showcase', 'exports'];

function isTab(v: string | null): v is TabId {
  return v !== null && (TABS as string[]).includes(v);
}

export default function SharePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { brand, isLoading, error } = useBrandBySlug(slug);
  const { update } = useBrandStore();
  const [toggling, setToggling] = useState(false);
  const { openSettingsTab } = useBrandSettings();

  const showcaseUrl = `${window.location.origin}/brand/${slug}/showcase`;
  const portalUrl = `${window.location.origin}/p/${slug}`;

  const embedCode = `<iframe src="${showcaseUrl}" width="100%" height="800" frameborder="0" style="border:none;border-radius:12px;" title="${brand?.name || 'Brand'} Guidelines"></iframe>`;

  const activeTab: TabId = useMemo(() => {
    const t = searchParams.get('tab');
    return isTab(t) ? t : 'guidelines';
  }, [searchParams]);

  const handleTabChange = useCallback(
    (value: string) => {
      if (!isTab(value)) return;
      const next = new URLSearchParams(searchParams);
      if (value === 'guidelines') next.delete('tab');
      else next.set('tab', value);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const innerNav = useMemo<InnerNavConfig>(() => ({
    title: 'Share',
    icon: Share2,
    storageKey: 'brandos:share-nav-open',
    groups: [
      {
        id: 'tabs',
        label: 'Sections',
        items: [
          { id: 'guidelines', label: 'Guidelines', icon: BookOpen, href: `/b/${slug}/share` },
          { id: 'showcase',   label: 'Showcase',   icon: Globe,    href: `/b/${slug}/share?tab=showcase` },
          { id: 'exports',    label: 'Exports',    icon: Download, href: `/b/${slug}/share?tab=exports` },
        ],
      },
    ],
  }), [slug]);

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
      <PageHeader
        compact
        title="Share"
        subtitle="Turn this brand into something you can send out — links, decks, and downloads."
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="guidelines" className="gap-2">
            <BookOpen className="w-4 h-4" />
            <span>Guidelines</span>
          </TabsTrigger>
          <TabsTrigger value="showcase" className="gap-2">
            <Globe className="w-4 h-4" />
            <span>Showcase</span>
          </TabsTrigger>
          <TabsTrigger value="exports" className="gap-2">
            <Download className="w-4 h-4" />
            <span>Exports</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === 'guidelines' && (
        <GuidelinesTab
          onReadHub={() => navigate(`/b/${slug}/guidelines`)}
          onSlideEditor={() => navigate(`/b/${slug}/brand-guides`)}
          onCanvasEditor={() => navigate(`/b/${slug}/guidelines/canvas`)}
          onBlocks={() => navigate(`/b/${slug}/guidelines/blocks`)}
        />
      )}

      {activeTab === 'showcase' && (
        <ShowcaseTab
          isPublic={isPublic}
          toggling={toggling}
          onTogglePublic={togglePublic}
          onOpenSettings={() => openSettingsTab('sharing')}
          showcaseUrl={showcaseUrl}
          portalUrl={portalUrl}
          embedCode={embedCode}
          onCopy={copyText}
          slug={slug!}
        />
      )}

      {activeTab === 'exports' && (
        <ExportsTab
          onLogoDeck={() => navigate(`/b/${slug}/logo-presentation`)}
          onGuidelinesExport={() => navigate(`/b/${slug}/guidelines`)}
          onCaseStudy={() => navigate(`/b/${slug}/case-study`)}
          onOpenPortal={() => window.open(portalUrl, '_blank')}
        />
      )}
    </div>
  );
}

/* ---- Tab panels ---- */

function GuidelinesTab({
  onReadHub,
  onSlideEditor,
  onCanvasEditor,
  onBlocks,
}: {
  onReadHub: () => void;
  onSlideEditor: () => void;
  onCanvasEditor: () => void;
  onBlocks: () => void;
}) {
  const cards: { title: string; description: string; icon: React.ElementType; accent: string; onClick: () => void }[] = [
    {
      title: 'Read the brand guidelines',
      description: 'The brand book — strategy, logo, colors, typography, voice.',
      icon: BookOpen,
      accent: 'from-rose-500 to-pink-600',
      onClick: onReadHub,
    },
    {
      title: 'Slide editor',
      description: 'Edit the guidelines deck slide-by-slide.',
      icon: FileText,
      accent: 'from-purple-500 to-violet-600',
      onClick: onSlideEditor,
    },
    {
      title: 'Canvas editor',
      description: 'Free-form canvas for bespoke guideline layouts.',
      icon: Edit,
      accent: 'from-sky-500 to-blue-600',
      onClick: onCanvasEditor,
    },
    {
      title: 'Block-based editor',
      description: 'Notion-style block editor for long-form guidelines.',
      icon: FileText,
      accent: 'from-emerald-500 to-teal-600',
      onClick: onBlocks,
    },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card
            key={c.title}
            onClick={c.onClick}
            className="group relative overflow-hidden p-5 cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5"
          >
            <div className={`absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br ${c.accent} opacity-10 group-hover:opacity-20 transition-opacity`} />
            <div className={`relative w-11 h-11 rounded-xl bg-gradient-to-br ${c.accent} flex items-center justify-center mb-3`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <h3 className="relative text-base font-semibold mb-1">{c.title}</h3>
            <p className="relative text-xs text-muted-foreground">{c.description}</p>
          </Card>
        );
      })}
    </div>
  );
}

function ShowcaseTab({
  isPublic,
  toggling,
  onTogglePublic,
  onOpenSettings,
  showcaseUrl,
  portalUrl,
  embedCode,
  onCopy,
  slug,
}: {
  isPublic: boolean;
  toggling: boolean;
  onTogglePublic: () => void;
  onOpenSettings: () => void;
  showcaseUrl: string;
  portalUrl: string;
  embedCode: string;
  onCopy: (text: string, label: string) => void;
  slug: string;
}) {
  return (
    <div className="space-y-4">
      <Card className="p-5">
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
          <Button variant={isPublic ? 'outline' : 'default'} size="sm" onClick={onTogglePublic} disabled={toggling} className="gap-1.5">
            {isPublic ? <><EyeOff className="h-3.5 w-3.5" />Make Private</> : <><Eye className="h-3.5 w-3.5" />Make Public</>}
          </Button>
        </div>
        <button onClick={onOpenSettings} className="text-xs text-primary hover:underline mt-3">
          More sharing options in Brand Settings &rarr;
        </button>
      </Card>

      <Card className="p-5">
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
              <Button variant="outline" size="sm" onClick={() => onCopy(showcaseUrl, 'Showcase link')} className="gap-2"><Copy className="w-3.5 h-3.5" />Copy</Button>
              <Button size="sm" onClick={() => window.open(`/brand/${slug}/showcase`, '_blank')}>Open</Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5">
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
              <Button variant="outline" size="sm" onClick={() => onCopy(embedCode, 'Embed code')} className="absolute top-2 right-2 gap-1.5 h-7 text-xs">
                <Copy className="w-3 h-3" />Copy
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5">
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
              <Button variant="outline" size="sm" onClick={() => onCopy(portalUrl, 'Portal link')} className="gap-2"><Copy className="w-3.5 h-3.5" />Copy</Button>
              <Button size="sm" onClick={() => window.open(portalUrl, '_blank')}>Open</Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ExportsTab({
  onLogoDeck,
  onGuidelinesExport,
  onCaseStudy,
  onOpenPortal: _onOpenPortal,
}: {
  onLogoDeck: () => void;
  onGuidelinesExport: () => void;
  onCaseStudy: () => void;
  onOpenPortal: () => void;
}) {
  return (
    <div className="space-y-4">
      <Card
        className="p-5 cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5 relative overflow-hidden"
        onClick={onCaseStudy}
      >
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gradient-to-br from-orange-500 via-rose-500 to-purple-600 opacity-20 blur-2xl" />
        <div className="flex items-start gap-4 relative">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 via-rose-500 to-purple-600 flex items-center justify-center shrink-0">
            <Presentation className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold mb-1">Case Study Deck <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ml-1 bg-gradient-to-r from-orange-500 to-rose-500 text-white">NEW</span></h3>
            <p className="text-sm text-muted-foreground">Auto-composed Behance-style 10-slide presentation tailored to this brand. Export PDF or PNG zip.</p>
          </div>
        </div>
      </Card>

      <Card className="p-5 cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5" onClick={onLogoDeck}>
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

      <Card className="p-5 cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5" onClick={onGuidelinesExport}>
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
