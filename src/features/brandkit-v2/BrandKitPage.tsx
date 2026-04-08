/**
 * BrandKitPage — the unified Brand Kit v2 surface.
 *
 * Mounted at /b/:slug/kit AND /b/:slug/brandkit (legacy route now points
 * here so users land on the same hub regardless of how they navigate).
 *
 * Shell pattern (v3.3):
 *   - Inner nav is declared via `BrandLayout`'s `innerNav` prop, so the rail
 *     mounts as a structural column adjacent to AppRail (not as a card
 *     floating inside the page body).
 *   - One PageHeader at the top of the content. No bespoke sticky brand bars.
 *   - Sections are anchored so the inner nav can smooth-scroll to them.
 */
import * as React from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Edit3,
  Share2,
  Download,
  Loader2,
  Settings as SettingsIcon,
  Image as ImageIcon,
  Palette,
  Type,
  CreditCard,
  Instagram,
  Smile,
  Box,
  BookOpen,
  Facebook,
  Square,
  Smartphone,
  Presentation,
  Play,
  QrCode,
  FileText,
  PenTool,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { useActiveAnchor, type InnerNavConfig } from '@/shared/layouts/InnerNavRail';
import { useBrandPageConfig } from '@/shared/layouts/brandPageConfig';
import { useBrandStore } from '@/shared/store/brandStore';
import { exportBrandKitZip } from './bulkExport';
import { downloadBlob } from './downloaders';
import { SettingsSection } from './sections/SettingsSection';
import { LogoSection } from './sections/LogoSection';
import { ColorsSection } from './sections/ColorsSection';
import { TypographySection } from './sections/TypographySection';
import { StationerySection } from './sections/StationerySection';
import { SocialSection } from './sections/SocialSection';
import { FaviconSection } from './sections/FaviconSection';
import { MockupsSection } from './sections/MockupsSection';
import { BrandBookSection } from './sections/BrandBookSection';

const ANCHORS = [
  'settings',
  'logo',
  'colors',
  'typography',
  'stationery',
  'social',
  'favicons',
  'mockups',
  'brand-book',
];

export default function BrandKitPage() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { current, loadBySlug } = useBrandStore();
  const [exporting, setExporting] = React.useState(false);
  const [progress, setProgress] = React.useState<{ pct: number; label: string }>({ pct: 0, label: '' });
  const activeAnchor = useActiveAnchor(ANCHORS);

  // Inner-nav config — published to BrandRouteLayout so the rail mounts as
  // a structural column next to AppRail. Two groups: in-page anchors and
  // deep editor route links.
  const innerNav = React.useMemo<InnerNavConfig | undefined>(() => slug
    ? {
        title: 'Brand Kit',
        icon: Wand2,
        storageKey: 'brandos:brandkit-nav-open',
        activeAnchor,
        groups: [
          {
            id: 'sections',
            label: 'On this page',
            items: [
              { id: 'settings', label: 'Settings', icon: SettingsIcon, anchor: 'settings' },
              { id: 'logo', label: 'Logo', icon: ImageIcon, anchor: 'logo' },
              { id: 'colors', label: 'Colors', icon: Palette, anchor: 'colors' },
              { id: 'typography', label: 'Typography', icon: Type, anchor: 'typography' },
              { id: 'stationery', label: 'Stationery', icon: CreditCard, anchor: 'stationery' },
              { id: 'social', label: 'Social & Screen', icon: Instagram, anchor: 'social' },
              { id: 'favicons', label: 'Favicons', icon: Smile, anchor: 'favicons' },
              { id: 'mockups', label: 'Mockups', icon: Box, anchor: 'mockups' },
              { id: 'brand-book', label: 'Brand book', icon: BookOpen, anchor: 'brand-book' },
            ],
          },
          {
            id: 'editors',
            label: 'Deep editors',
            items: [
              { id: 'brand-guides', label: 'Brand Guides', icon: BookOpen, href: `/dashboard/brand/${slug}/brand-guides` },
              { id: 'profile-icons', label: 'Profile Icons', icon: Smile, href: `/b/${slug}/brandkit/profile-icons` },
              { id: 'business-cards', label: 'Business Cards', icon: CreditCard, href: `/b/${slug}/brandkit/business-cards` },
              { id: 'facebook-covers', label: 'Facebook Covers', icon: Facebook, href: `/b/${slug}/brandkit/facebook-covers` },
              { id: 'instagram-posts', label: 'Instagram Posts', icon: Square, href: `/b/${slug}/brandkit/instagram-posts` },
              { id: 'instagram-stories', label: 'Instagram Stories', icon: Smartphone, href: `/b/${slug}/brandkit/instagram-stories` },
              { id: 'presentations', label: 'Presentations', icon: Presentation, href: `/b/${slug}/brandkit/presentations` },
              { id: 'animations', label: 'Animations', icon: Play, href: `/b/${slug}/brandkit/animations` },
              { id: 'qr-code', label: 'QR Code', icon: QrCode, href: `/b/${slug}/brandkit/qr-code` },
              { id: 'invoices', label: 'Invoices', icon: FileText, href: `/b/${slug}/brandkit/invoices` },
              { id: 'design-tool', label: 'Design Tool', icon: PenTool, href: `/b/${slug}/brandkit/design-tool` },
            ],
          },
        ],
      }
    : undefined,
    [slug, activeAnchor],
  );

  useBrandPageConfig({ brandName: current?.name, maxWidth: '7xl', innerNav });

  React.useEffect(() => {
    if (slug) loadBySlug(slug);
  }, [slug, loadBySlug]);

  // If a hash is present on first mount, scroll to it
  React.useEffect(() => {
    if (!current) return;
    const hash = location.hash.replace('#', '');
    if (!hash) return;
    setTimeout(() => {
      const el = document.getElementById(`section-${hash}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, [current, location.hash]);

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
    return <div className="p-8 text-sm text-muted-foreground">Loading brand kit…</div>;
  }

  return (
    <>
      <PageHeader
        title="Brand Kit"
        subtitle={`Everything in ${current.name}'s brand system, in one place. ${completeness}% complete.`}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/b/${slug}/settings`)}
            >
              <Edit3 className="h-3.5 w-3.5 mr-1.5" />
              Brand Settings
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/p/${slug}`, '_blank', 'noopener,noreferrer')}
            >
              <Share2 className="h-3.5 w-3.5 mr-1.5" />
              Share portal
            </Button>
            <Button size="sm" onClick={handleBulkExport} disabled={exporting}>
              {exporting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  {progress.pct}% · {progress.label}
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Download .zip
                </>
              )}
            </Button>
          </>
        }
      />

      <div className="space-y-14 pb-12">
        <div id="section-settings" className="scroll-mt-32">
          <SettingsSection slug={slug} />
        </div>
        <div id="section-logo" className="scroll-mt-32">
          <LogoSection brand={current} slug={slug} />
        </div>
        <div id="section-colors" className="scroll-mt-32">
          <ColorsSection brand={current} slug={slug} />
        </div>
        <div id="section-typography" className="scroll-mt-32">
          <TypographySection brand={current} slug={slug} />
        </div>
        <div id="section-stationery" className="scroll-mt-32">
          <StationerySection brand={current} slug={slug} />
        </div>
        <div id="section-social" className="scroll-mt-32">
          <SocialSection brand={current} slug={slug} />
        </div>
        <div id="section-favicons" className="scroll-mt-32">
          <FaviconSection brand={current} slug={slug} />
        </div>
        <div id="section-mockups" className="scroll-mt-32">
          <MockupsSection brand={current} slug={slug} />
        </div>
        <div id="section-brand-book" className="scroll-mt-32">
          <BrandBookSection brand={current} slug={slug} />
        </div>
      </div>
    </>
  );
}
