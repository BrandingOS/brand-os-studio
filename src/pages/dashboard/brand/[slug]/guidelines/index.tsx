/**
 * GuidelinesHubPage — brand-scoped guidelines hub.
 *
 * Mounts inside BrandLayout (so AppRail and BrandNavbar stay visible — the
 * page does NOT take over the screen) and uses InnerNavRail to expose the
 * canonical guideline sections as in-page anchors. Same shape as
 * BrandKitPage so users get muscle memory across the product.
 *
 * The deep slide editor (`/brand-guides`) is an intentional fullscreen
 * experience and is reachable from a single clearly-labeled action in the
 * page header — not from the inner nav, so the inner nav stays in-shell.
 */
import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Target,
  PenTool,
  Palette,
  Type,
  MessageCircle,
  Layers,
  Edit,
  Download,
  ExternalLink,
} from 'lucide-react';
import { useMemo } from 'react';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { useActiveAnchor, type InnerNavConfig } from '@/shared/layouts/InnerNavRail';
import { useBrandPageConfig } from '@/shared/layouts/brandPageConfig';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const ANCHORS = [
  'overview',
  'strategy',
  'logo',
  'colors',
  'typography',
  'voice',
  'applications',
];

export default function GuidelinesHubPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { brand, isLoading, error } = useBrandBySlug(slug);
  const activeAnchor = useActiveAnchor(ANCHORS);

  const innerNav = useMemo<InnerNavConfig>(() => ({
    title: 'Guidelines',
    icon: BookOpen,
    storageKey: 'brandos:guidelines-nav-open',
    activeAnchor,
    groups: [
      {
        id: 'sections',
        label: 'On this page',
        items: [
          { id: 'overview',     label: 'Overview',     icon: BookOpen,      anchor: 'overview' },
          { id: 'strategy',     label: 'Strategy',     icon: Target,        anchor: 'strategy' },
          { id: 'logo',         label: 'Logo',         icon: PenTool,       anchor: 'logo' },
          { id: 'colors',       label: 'Colors',       icon: Palette,       anchor: 'colors' },
          { id: 'typography',   label: 'Typography',   icon: Type,          anchor: 'typography' },
          { id: 'voice',        label: 'Voice & Tone', icon: MessageCircle, anchor: 'voice' },
          { id: 'applications', label: 'Applications', icon: Layers,        anchor: 'applications' },
        ],
      },
    ],
  }), [activeAnchor]);

  useBrandPageConfig({ brandName: brand?.name, maxWidth: '7xl', innerNav });

  if (isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading guidelines…</div>;
  }

  if (error || !brand) {
    return (
      <Card className="p-8 text-center max-w-lg mx-auto mt-12">
        <h3 className="text-lg font-semibold mb-2">Brand not found</h3>
        <p className="text-muted-foreground mb-4">
          {error || 'The requested brand could not be found.'}
        </p>
        <Button onClick={() => navigate('/dashboard/brands')}>Back to brands</Button>
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        compact
        title="Guidelines"
        subtitle="The brand book — strategy, logo, color, type, voice, and applications."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/dashboard/brand/${slug}/brand-guides`)}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Slide Editor
            </Button>
            <Button size="sm">
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Download PDF
            </Button>
          </>
        }
      />

      <div className="space-y-12 pb-12">
          {/* Overview */}
          <section id="section-overview" className="scroll-mt-32">
            <SectionHeader title="Overview" subtitle="What this brand stands for" />
            <Card className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Stat label="Tone" value={brand.tone || '—'} />
                <Stat label="Audience" value={brand.audience || '—'} />
                <Stat
                  label="Primary color"
                  value={brand.primaryColor}
                  swatch={brand.primaryColor}
                />
              </div>
            </Card>
          </section>

          {/* Strategy */}
          <section id="section-strategy" className="scroll-mt-32">
            <SectionHeader
              title="Brand Strategy"
              subtitle="Core positioning and values"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/dashboard/brand/${slug}/identity?tab=strategy`)}
                >
                  <Edit className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
              }
            />
            <Card className="p-6">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {brand.strategy ||
                  'No strategy written yet. Open the Identity editor to add your mission, values, and positioning.'}
              </p>
            </Card>
          </section>

          {/* Logo */}
          <section id="section-logo" className="scroll-mt-32">
            <SectionHeader
              title="Logo System"
              subtitle="Logo usage and variations"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/dashboard/brand/${slug}/identity?tab=logo`)}
                >
                  <Edit className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
              }
            />
            <Card className="p-6">
              {brand.logo || brand.logoAssets?.full ? (
                <div className="flex items-center justify-center bg-muted/30 rounded-lg p-8 min-h-[180px]">
                  <img
                    src={brand.logoAssets?.full || brand.logo}
                    alt={`${brand.name} logo`}
                    className="max-h-32 max-w-full object-contain"
                  />
                </div>
              ) : (
                <EmptyState message="No logo uploaded yet." />
              )}
            </Card>
          </section>

          {/* Colors */}
          <section id="section-colors" className="scroll-mt-32">
            <SectionHeader
              title="Color Palette"
              subtitle="Brand color definitions"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/dashboard/brand/${slug}/identity?tab=colors`)}
                >
                  <Edit className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
              }
            />
            <Card className="p-6">
              <div className="flex flex-wrap gap-4">
                {brand.primaryColor && (
                  <Swatch label="Primary" value={brand.primaryColor} />
                )}
                {brand.secondaryColor && (
                  <Swatch label="Secondary" value={brand.secondaryColor} />
                )}
                {!brand.primaryColor && !brand.secondaryColor && (
                  <EmptyState message="No colors defined yet." />
                )}
              </div>
            </Card>
          </section>

          {/* Typography */}
          <section id="section-typography" className="scroll-mt-32">
            <SectionHeader
              title="Typography"
              subtitle="Font selections and hierarchy"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/dashboard/brand/${slug}/identity?tab=typography`)}
                >
                  <Edit className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
              }
            />
            <Card className="p-6 space-y-4">
              {brand.fonts?.primary ? (
                <FontSample label="Primary" font={brand.fonts.primary} />
              ) : (
                <EmptyState message="No primary font selected yet." />
              )}
              {brand.fonts?.secondary && (
                <FontSample label="Secondary" font={brand.fonts.secondary} />
              )}
            </Card>
          </section>

          {/* Voice */}
          <section id="section-voice" className="scroll-mt-32">
            <SectionHeader
              title="Voice & Tone"
              subtitle="How this brand sounds"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/dashboard/brand/${slug}/identity?tab=voice`)}
                >
                  <Edit className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
              }
            />
            <Card className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Stat label="Tone" value={brand.tone || '—'} />
                <Stat label="Audience" value={brand.audience || '—'} />
              </div>
            </Card>
          </section>

          {/* Applications */}
          <section id="section-applications" className="scroll-mt-32">
            <SectionHeader
              title="Applications"
              subtitle="How the brand shows up in the wild"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/dashboard/brand/${slug}/assets`)}
                >
                  <Edit className="h-3.5 w-3.5 mr-1.5" />
                  Open Designs
                </Button>
              }
            />
            <Card className="p-6">
              <p className="text-sm text-muted-foreground">
                Real-world applications of the brand live in the Designs section
                — business cards, social media posts, presentations, mockups,
                and more. They're auto-parameterized by this brand's identity.
              </p>
            </Card>
          </section>
      </div>
    </>
  );
}

/* ----- Small section helpers (kept inline; one-page use only) -------- */

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      {action}
    </header>
  );
}

function Stat({ label, value, swatch }: { label: string; value: string; swatch?: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-1">
        {label}
      </p>
      <div className="flex items-center gap-2">
        {swatch && (
          <span
            className="inline-block h-4 w-4 rounded ring-1 ring-border"
            style={{ backgroundColor: swatch }}
          />
        )}
        <span className="text-sm font-medium text-foreground">{value}</span>
      </div>
    </div>
  );
}

function Swatch({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3 min-w-[180px]">
      <span
        className="h-12 w-12 rounded-md ring-1 ring-border shrink-0"
        style={{ backgroundColor: value }}
      />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function FontSample({ label, font }: { label: string; font: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-1">
        {label} · {font}
      </p>
      <p
        className="text-3xl text-foreground leading-tight"
        style={{ fontFamily: font }}
      >
        The quick brown fox jumps over the lazy dog
      </p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-sm text-muted-foreground italic text-center py-6">{message}</p>
  );
}
