import React from 'react';
import type { Brand } from '@/shared/types/brand';
import { HeroSection } from './sections/HeroSection';
import { StrategySection } from './sections/StrategySection';
import { LogoSection } from './sections/LogoSection';
import { ColorSection } from './sections/ColorSection';
import { TypographySection } from './sections/TypographySection';
import { VoiceSection } from './sections/VoiceSection';
import { ApplicationsSection } from './sections/ApplicationsSection';
import { AssetsSection } from './sections/AssetsSection';
import { GuidelineNav } from './sections/GuidelineNav';

interface BrandGuidelinePageProps {
  brand: Brand;
  isPublic?: boolean;
}

const SECTIONS = [
  { id: 'section-strategy', number: '01', title: 'Strategy' },
  { id: 'section-logo', number: '02', title: 'Logo' },
  { id: 'section-colors', number: '03', title: 'Colors' },
  { id: 'section-typography', number: '04', title: 'Typography' },
  { id: 'section-voice', number: '05', title: 'Voice' },
  { id: 'section-applications', number: '06', title: 'Applications' },
  { id: 'section-assets', number: '07', title: 'Assets' },
];

export const BrandGuidelinePage: React.FC<BrandGuidelinePageProps> = ({
  brand,
  isPublic = false,
}) => {
  const visibleSections = isPublic
    ? SECTIONS.filter((s) => s.id !== 'section-assets')
    : SECTIONS;

  return (
    <div className="scroll-smooth min-h-screen bg-white">
      <GuidelineNav brand={brand} sections={visibleSections} />

      <div className="lg:ml-48">
        {/* Hero */}
        <div id="section-hero">
          <HeroSection brand={brand} />
        </div>

        {/* Strategy */}
        <div id="section-strategy">
          <StrategySection brand={brand} />
        </div>

        {/* Logo */}
        <div id="section-logo">
          <LogoSection brand={brand} />
        </div>

        {/* Colors */}
        <div id="section-colors">
          <ColorSection brand={brand} />
        </div>

        {/* Typography */}
        <div id="section-typography">
          <TypographySection brand={brand} />
        </div>

        {/* Voice */}
        <div id="section-voice">
          <VoiceSection brand={brand} />
        </div>

        {/* Applications */}
        <div id="section-applications">
          <ApplicationsSection brand={brand} />
        </div>

        {/* Assets & Downloads (hidden for public view) */}
        {!isPublic && (
          <div id="section-assets">
            <AssetsSection brand={brand} />
          </div>
        )}
      </div>
    </div>
  );
};

export default BrandGuidelinePage;
