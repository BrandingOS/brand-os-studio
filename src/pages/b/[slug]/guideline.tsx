import { useCallback, useMemo, useRef, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { CosmosWorkspaceShell } from '@/shared/layouts/CosmosWorkspaceShell';
import { useBrandFromSlug } from '@/shared/hooks/useBrandFromSlug';
import { ArrowRight } from '@/features/setup/components/SetupIcons';
import {
  GuidelineSidebar,
  type GuidelineEntry,
  type GuidelineSectionKey,
} from '@/features/guideline-cosmos/components/GuidelineSidebar';
import {
  GuidelineBoard,
  type GuidelineBoardRefs,
} from '@/features/guideline-cosmos/components/GuidelineBoard';
import type { Brand } from '@/shared/types/brand';

/**
 * Brand-scoped Guideline tab at `/b/:slug/guideline`.
 *
 * Renders the guideline surface inside the new 5-tab Cosmos shell: a
 * two-column shell with a left outline panel and a right editorial board
 * that projects the canonical `Brand` shape into seven documented
 * sections (Strategy, Logo Usage, Color, Typography, Voice & Tone,
 * Photography, Applications).
 *
 * The richer canvas-based editor at `/b/:slug/guidelines/canvas` stays
 * untouched — this tab gives a read-forward overview and exposes a
 * "View Canvas" affordance in the shell's top-right slot for authors who
 * want to open the fullscreen editor.
 *
 * When the slug hasn't resolved yet (still loading, or not found), the
 * page renders a graceful empty state inside the same shell so users
 * never see a white flash.
 */
export default function BrandGuidelineTabPage() {
  const { slug } = useParams<{ slug: string }>();
  const { brand, isLoading } = useBrandFromSlug(slug);

  const canvasHref = slug ? `/b/${slug}/guidelines/canvas` : '/';

  if (!brand) {
    return (
      <CosmosWorkspaceShell
        rightActions={
          <RouterLink to={canvasHref} className="pill-btn pill-btn--ghost">
            <span>View Canvas</span>
            <ArrowRight size={14} className="pill-btn-arrow" />
          </RouterLink>
        }
      >
        <div className="workspace-empty" role="main">
          <span className="workspace-empty-eyebrow">Guideline</span>
          <h1>{isLoading ? 'Loading your brand…' : 'Brand not found'}</h1>
          <p>
            {isLoading
              ? 'Pulling strategy, logo, color, and typography from the vault.'
              : 'We couldn’t find a brand for this URL. Try choosing one from the switcher.'}
          </p>
        </div>
      </CosmosWorkspaceShell>
    );
  }

  return <GuidelinePageInner brand={brand} canvasHref={canvasHref} />;
}

function GuidelinePageInner({ brand, canvasHref }: { brand: Brand; canvasHref: string }) {
  const [activeKey, setActiveKey] = useState<GuidelineSectionKey | null>('strategy');
  const sectionRefs = useRef<GuidelineBoardRefs>({
    strategy: null,
    logo: null,
    color: null,
    typography: null,
    voice: null,
    photography: null,
    applications: null,
  });

  const entries = useMemo<GuidelineEntry[]>(() => {
    const s = brand.guidelines?.strategy;
    const hasStrategy =
      !!(s?.mission?.trim() || s?.vision?.trim() || (s?.values ?? []).some((v) => v?.trim())) ||
      !!brand.audience?.trim();

    const logoCount =
      (brand.logoSystem?.primary ? 1 : 0) +
      (brand.logoSystem?.wordmark ? 1 : 0) +
      (brand.logoSystem?.iconmark ? 1 : 0) +
      (brand.logoAssets?.full ? 1 : 0) +
      (brand.logoAssets?.wordmark ? 1 : 0) +
      (brand.logoAssets?.icon ? 1 : 0);
    const hasLogo = logoCount > 0 || !!brand.logo;

    const colorCount =
      (brand.colorSystem?.primary?.hex ? 1 : 0) +
      (brand.colorSystem?.secondary?.hex ? 1 : 0) +
      (brand.accentColor ? 1 : 0) +
      (brand.neutrals?.length ?? 0);
    const hasColor = !!brand.primaryColor || colorCount > 0;

    const hasTypography =
      !!(brand.typography?.primary?.family ?? brand.fonts?.primary) ||
      !!(brand.typography?.secondary?.family ?? brand.fonts?.secondary);

    const v = brand.guidelines?.voiceAndTone;
    const hasVoice =
      !!v?.brandVoice?.trim() ||
      !!brand.tone?.trim() ||
      (v?.toneAttributes ?? []).some((t) => t?.trim());

    // Accept both legacy `.type` and v3 `.kind` so this counts correctly
    // regardless of which BrandAsset shape the store projects.
    const photoCount = (brand.brandAssets ?? []).filter(
      (a: any) => a?.type === 'image' || a?.kind === 'image',
    ).length;
    const hasPhoto = photoCount > 0;

    const apps = brand.guidelines?.applications;
    const hasApps =
      !!(apps?.digital?.length || apps?.print?.length || apps?.packaging?.length || apps?.environmental?.length);

    return [
      {
        key: 'strategy',
        name: 'Strategy',
        sub: hasStrategy ? 'Mission · Vision · Values' : 'Not set',
        added: hasStrategy,
      },
      {
        key: 'logo',
        name: 'Logo Usage',
        sub: hasLogo ? `${Math.max(1, logoCount)} variant${logoCount === 1 ? '' : 's'}` : 'Not set',
        added: hasLogo,
      },
      {
        key: 'color',
        name: 'Color',
        sub: hasColor ? 'Palette defined' : 'Not set',
        added: hasColor,
      },
      {
        key: 'typography',
        name: 'Typography',
        sub: hasTypography
          ? brand.typography?.primary?.family ?? brand.fonts?.primary ?? 'Type system'
          : 'Not set',
        added: hasTypography,
      },
      {
        key: 'voice',
        name: 'Voice & Tone',
        sub: hasVoice ? 'Documented' : 'Not set',
        added: hasVoice,
      },
      {
        key: 'photography',
        name: 'Photography',
        sub: hasPhoto ? `${photoCount} reference${photoCount === 1 ? '' : 's'}` : 'Not set',
        added: hasPhoto,
      },
      {
        key: 'applications',
        name: 'Applications',
        sub: hasApps ? 'Examples' : 'Not set',
        added: hasApps,
      },
    ];
  }, [brand]);

  const handleJump = useCallback((key: GuidelineSectionKey) => {
    setActiveKey(key);
    const el = sectionRefs.current[key];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return (
    <CosmosWorkspaceShell
      rightActions={
        <RouterLink to={canvasHref} className="pill-btn pill-btn--ghost">
          <span>View Canvas</span>
          <ArrowRight size={14} className="pill-btn-arrow" />
        </RouterLink>
      }
    >
      <div className="shell">
        <GuidelineSidebar
          brandName={brand.name}
          entries={entries}
          activeKey={activeKey}
          onJump={handleJump}
        />
        <GuidelineBoard brand={brand} sectionRefs={sectionRefs} />
      </div>
    </CosmosWorkspaceShell>
  );
}
