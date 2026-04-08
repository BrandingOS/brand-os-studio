/**
 * BrandHomePage — the brand's overview screen.
 *
 * Pure information-architecture surface: at a glance, what state is this
 * brand in, and what should I do next? Uses the unified BrandLayout shell
 * (no bespoke headers, no in-page sticky bars). PageHeader provides the
 * single page-level title; the body is composed of clean uniform cards
 * that match the rest of the product.
 *
 * Pages this page leads into:
 *   - Setup       /edit          (the brand-record editor)
 *   - Brand Kit   /kit           (the unified brand kit hub)
 *   - Guidelines  /guidelines    (the brand book)
 *   - Folders     /folders       (asset library)
 *   - Designs     /assets        (generated deliverables)
 *   - Templates   /templates     (brand-scoped templates)
 */
import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TeamPanel } from '@/features/collaboration';
import { SharePanel } from '@/features/brand/components/SharePanel';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { useBrandStore } from '@/shared/store/brandStore';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useActiveAnchor, type InnerNavConfig } from '@/shared/layouts/InnerNavRail';
import { useBrandPageConfig } from '@/shared/layouts/brandPageConfig';
import type { Brand } from '@/shared/types/brand';
import {
  Wrench,
  BookOpen,
  FolderOpen,
  Sparkles,
  Palette,
  LayoutTemplate,
  ArrowRight,
  Edit3,
  LayoutDashboard,
  Compass,
  Target,
  Users,
} from 'lucide-react';

interface QuickLink {
  label: string;
  description: string;
  path: string;
  icon: React.ElementType;
}

const QUICK_LINKS: QuickLink[] = [
  { label: 'Setup',      description: 'Edit logos, colors, type',     path: 'edit',       icon: Wrench },
  { label: 'Brand Kit',  description: 'The unified brand system',     path: 'kit',        icon: Sparkles },
  { label: 'Guidelines', description: 'The brand book',               path: 'guidelines', icon: BookOpen },
  { label: 'Folders',    description: 'Asset library',                path: 'folders',    icon: FolderOpen },
  { label: 'Designs',    description: 'Generated deliverables',       path: 'assets',     icon: Palette },
  { label: 'Templates',  description: 'Brand-scoped templates',       path: 'templates',  icon: LayoutTemplate },
];

const OVERVIEW_ANCHORS = ['glance', 'jump', 'identity', 'sharing'];

export default function BrandHomePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { brand, isLoading, error } = useBrandBySlug(slug);
  const updateBrand = useBrandStore((s) => s.update);
  const activeAnchor = useActiveAnchor(OVERVIEW_ANCHORS);

  const innerNav = useMemo<InnerNavConfig>(() => ({
    title: 'Overview',
    icon: LayoutDashboard,
    storageKey: 'brandos:overview-nav-open',
    activeAnchor,
    groups: [
      {
        id: 'sections',
        label: 'On this page',
        items: [
          { id: 'glance',   label: 'At a glance',         icon: LayoutDashboard, anchor: 'glance' },
          { id: 'jump',     label: 'Jump into',           icon: Compass,         anchor: 'jump' },
          { id: 'identity', label: 'Identity highlights', icon: Target,          anchor: 'identity' },
          { id: 'sharing',  label: 'Sharing & team',      icon: Users,           anchor: 'sharing' },
        ],
      },
    ],
  }), [activeAnchor]);

  useBrandPageConfig({ brandName: brand?.name, maxWidth: '7xl', innerNav });

  const handleBrandUpdate = async (patch: Partial<Brand>) => {
    if (!brand) return;
    await updateBrand(brand.id, patch);
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
      <Card className="p-8 text-center max-w-lg mx-auto mt-12">
        <h3 className="text-lg font-semibold mb-2">Brand not found</h3>
        <p className="text-muted-foreground mb-4">{error || 'Could not load brand.'}</p>
        <Button onClick={() => navigate('/dashboard/brands')}>Back to brands</Button>
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle={brand.tone || 'At a glance — what this brand is and where to go next.'}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/dashboard/brand/${slug}/edit`)}
          >
            <Edit3 className="h-3.5 w-3.5 mr-1.5" />
            Edit brand
          </Button>
        }
      />

      <div className="space-y-12">
        {/* At-a-glance card --------------------------------------------- */}
        <section id="section-glance" className="scroll-mt-24">
        <Card className="p-6">
          <div className="flex items-start gap-5">
            {brand.logo ? (
              <div className="h-16 w-16 rounded-xl bg-muted/30 flex items-center justify-center p-2 ring-1 ring-border shrink-0">
                <img src={brand.logo} alt="" className="max-h-full max-w-full object-contain" />
              </div>
            ) : (
              <div
                className="h-16 w-16 rounded-xl flex items-center justify-center text-xl font-bold text-white ring-1 ring-border shrink-0"
                style={{ backgroundColor: brand.primaryColor }}
              >
                {brand.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1 grid grid-cols-2 sm:grid-cols-4 gap-5">
              <Stat label="Tone" value={brand.tone || '—'} />
              <Stat label="Audience" value={brand.audience || '—'} />
              <ColorStat label="Colors" primary={brand.primaryColor} secondary={brand.secondaryColor} />
              <Stat label="Visibility" value={brand.isPublic ? 'Public' : 'Private'} />
            </div>
          </div>
        </Card>
        </section>

        {/* Quick links — uniform card grid ------------------------------ */}
        <section id="section-jump" className="scroll-mt-24">
        <Section title="Jump into" subtitle="The main surfaces of this brand">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {QUICK_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <button
                  key={link.path}
                  onClick={() => navigate(`/dashboard/brand/${slug}/${link.path}`)}
                  className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{link.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{link.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </button>
              );
            })}
          </div>
        </Section>
        </section>

        {/* Brand identity summary (only when populated) ----------------- */}
        <section id="section-identity" className="scroll-mt-24">
        {brand.guidelines?.strategy && (
          <Section title="Identity highlights" subtitle="Pulled from the brand guidelines">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {brand.guidelines.strategy.mission && (
                <Card className="p-5">
                  <Eyebrow>Mission</Eyebrow>
                  <p className="text-sm text-foreground leading-relaxed">{brand.guidelines.strategy.mission}</p>
                </Card>
              )}
              {brand.guidelines.strategy.positioning && (
                <Card className="p-5">
                  <Eyebrow>Positioning</Eyebrow>
                  <p className="text-sm text-foreground leading-relaxed">{brand.guidelines.strategy.positioning}</p>
                </Card>
              )}
              {brand.guidelines.strategy.values && brand.guidelines.strategy.values.length > 0 && (
                <Card className="p-5">
                  <Eyebrow>Values</Eyebrow>
                  <div className="flex flex-wrap gap-1.5">
                    {brand.guidelines.strategy.values.map((v) => (
                      <span key={v} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{v}</span>
                    ))}
                  </div>
                </Card>
              )}
              {brand.guidelines.voiceAndTone?.toneAttributes && (
                <Card className="p-5">
                  <Eyebrow>Voice & Tone</Eyebrow>
                  <div className="flex flex-wrap gap-1.5">
                    {brand.guidelines.voiceAndTone.toneAttributes.map((t) => (
                      <span key={t} className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">{t}</span>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </Section>
        )}
        </section>

        {/* Sharing & team ---------------------------------------------- */}
        <section id="section-sharing" className="scroll-mt-24">
        <Section title="Sharing & team" subtitle="Public link, custom domain, and collaborators">
          <div className="space-y-4">
            <SharePanel brand={brand} onUpdate={handleBrandUpdate} />
            <TeamPanel brandId={slug ?? ''} brandName={brand.name} />
          </div>
        </Section>
        </section>
      </div>
    </>
  );
}

/* ---- Inline page helpers ---- */

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <header className="mb-3">
        <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <Eyebrow>{label}</Eyebrow>
      <p className="text-sm font-medium text-foreground truncate">{value}</p>
    </div>
  );
}

function ColorStat({
  label,
  primary,
  secondary,
}: {
  label: string;
  primary?: string;
  secondary?: string;
}) {
  return (
    <div className="min-w-0">
      <Eyebrow>{label}</Eyebrow>
      <div className="flex items-center gap-1.5">
        {primary && (
          <span
            className="h-5 w-5 rounded-full ring-1 ring-border"
            style={{ backgroundColor: primary }}
          />
        )}
        {secondary && (
          <span
            className="h-5 w-5 rounded-full ring-1 ring-border"
            style={{ backgroundColor: secondary }}
          />
        )}
        {!primary && !secondary && <span className="text-sm text-muted-foreground">—</span>}
      </div>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-1">
      {children}
    </p>
  );
}
