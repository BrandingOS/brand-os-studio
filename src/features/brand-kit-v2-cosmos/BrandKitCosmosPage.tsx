import { useCallback, useMemo, useRef, useState } from 'react';
import { CosmosWorkspaceShell } from '@/shared/layouts/CosmosWorkspaceShell';
import type { Brand } from '@/shared/types/brand';
import { BrandKitSidebar, type KitSectionKey, KIT_SECTIONS } from './components/BrandKitSidebar';
import { KitSection } from './components/KitSection';
import {
  LogoSystemSection,
  ColorPaletteSection,
  TypographySection,
  IconographySection,
  PhotographySection,
  BrandBoardSection,
  VoiceAndToneSection,
} from './components/sections';

/**
 * BrandKitCosmosPage — the Brand Kit surface rendered inside the new
 * floating 5-tab cosmos shell at /b/:slug/brand-kit.
 *
 * Mirrors `SetupPage`'s structure:
 *   - CosmosWorkspaceShell (auto-detects slug, renders pill nav)
 *   - `.shell` grid with a sticky `.panel` sidebar and a scrollable
 *     `.board-wrap` board of `<KitSection>` blocks
 *
 * The page is read-only for now — mutations land in a follow-up pass.
 * Each section renders real brand data from the `Brand` shape, with
 * graceful "empty" states when a field is missing. No BrandLayout /
 * AppRail anywhere — this is the v2 surface only.
 */
export function BrandKitCosmosPage({ brand }: { brand: Brand | undefined }) {
  const [activeKey, setActiveKey] = useState<KitSectionKey>('logo-system');

  const sectionRefs = useRef<Partial<Record<KitSectionKey, HTMLElement | null>>>({
    'logo-system': null,
    'color-palette': null,
    typography: null,
    iconography: null,
    photography: null,
    'brand-board': null,
    'voice-tone': null,
  });

  const handleJump = useCallback((key: KitSectionKey) => {
    setActiveKey(key);
    const el = sectionRefs.current[key];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const completion = useMemo(() => {
    if (!brand) return { completed: 0, total: KIT_SECTIONS.length };
    let n = 0;
    if (brand.logoSystem?.primary || brand.logoAssets?.full || brand.logo) n += 1;
    if (brand.colorSystem?.primary?.hex || brand.primaryColor) n += 1;
    if (brand.typography?.primary?.family || brand.fonts?.primary) n += 1;
    if ((brand.guidelines?.iconography?.examples?.length ?? 0) > 0) n += 1;
    if ((brand.brandAssets ?? brand.assets ?? []).some((a) => a.type === 'image' || a.kind === 'image')) n += 1;
    if (brand.uiStyle || brand.neutrals?.length) n += 1;
    if (brand.tone || brand.guidelines?.voiceAndTone?.brandVoice) n += 1;
    return { completed: n, total: KIT_SECTIONS.length };
  }, [brand]);

  const setRef = (key: KitSectionKey) => (el: HTMLElement | null) => {
    sectionRefs.current[key] = el;
  };

  return (
    <CosmosWorkspaceShell>
      <div className="shell">
        <BrandKitSidebar
          brand={brand}
          activeKey={activeKey}
          completed={completion.completed}
          total={completion.total}
          onJump={handleJump}
        />
        <div className="board-wrap">
          <KitSection
            dataKey="logo-system"
            title="Logo System"
            spec="Primary, wordmark, and iconmark"
            sectionRef={setRef('logo-system')}
          >
            <LogoSystemSection brand={brand} />
          </KitSection>
          <KitSection
            dataKey="color-palette"
            title="Color Palette"
            spec="Primary, secondary, accents & neutrals"
            sectionRef={setRef('color-palette')}
          >
            <ColorPaletteSection brand={brand} />
          </KitSection>
          <KitSection
            dataKey="typography"
            title="Typography"
            spec="Display, text & hierarchy"
            sectionRef={setRef('typography')}
          >
            <TypographySection brand={brand} />
          </KitSection>
          <KitSection
            dataKey="iconography"
            title="Iconography"
            spec="Icon style & system"
            sectionRef={setRef('iconography')}
          >
            <IconographySection brand={brand} />
          </KitSection>
          <KitSection
            dataKey="photography"
            title="Photography"
            spec="Imagery & visual references"
            sectionRef={setRef('photography')}
          >
            <PhotographySection brand={brand} />
          </KitSection>
          <KitSection
            dataKey="brand-board"
            title="Brand Board"
            spec="UI style, radius, spacing & weight"
            sectionRef={setRef('brand-board')}
          >
            <BrandBoardSection brand={brand} />
          </KitSection>
          <KitSection
            dataKey="voice-tone"
            title="Voice & Tone"
            spec="How the brand speaks"
            sectionRef={setRef('voice-tone')}
          >
            <VoiceAndToneSection brand={brand} />
          </KitSection>
        </div>
      </div>
    </CosmosWorkspaceShell>
  );
}

export default BrandKitCosmosPage;
