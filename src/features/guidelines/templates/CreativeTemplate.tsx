import React from 'react';
import type { Brand } from '@/shared/types/brand';
import type { GuidelineSettings } from '../types/guidelines';

interface CreativeTemplateProps {
  brand: Brand;
  settings: GuidelineSettings;
  slideContent: any;
  slideType: string;
}

export const CreativeTemplate: React.FC<CreativeTemplateProps> = ({
  brand,
  settings,
  slideContent,
  slideType,
}) => {
  const { spacing, header, footer, language } = settings;

  const primaryColor = brand.guidelines?.colorPalette?.primary?.hex || '#e63946';
  const secondaryColor = brand.guidelines?.colorPalette?.secondary?.hex || '#457b9d';

  const slideStyle = {
    padding: `${spacing.padding}px`,
    margin: `${spacing.margins}px`,
    borderRadius: `${spacing.cornerRadius}px`,
    direction: language.direction as 'ltr' | 'rtl',
  };

  const renderHeader = () => {
    if (!header.enabled) return null;

    return (
      <div className="flex justify-between items-end mb-12">
        {header.showProjectName && (
          <h1
            className="text-2xl font-black italic"
            style={{ color: primaryColor }}
          >
            {brand.name}
          </h1>
        )}
        <div className="flex items-center gap-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {header.showDate && (
            <span>{new Date().toLocaleDateString()}</span>
          )}
          {header.customText && (
            <span>{header.customText}</span>
          )}
        </div>
      </div>
    );
  };

  const renderFooter = () => {
    if (!footer.enabled) return null;

    return (
      <div className="flex justify-between items-center mt-12">
        <div
          className="h-1 flex-1 mr-4"
          style={{
            background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor}, transparent)`,
          }}
        />
        {footer.customText && (
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {footer.customText}
          </span>
        )}
        {footer.showPageNumbers && (
          <span
            className="ml-4 text-lg font-black"
            style={{ color: primaryColor }}
          >
            {slideContent?.pageNumber || 1}
          </span>
        )}
      </div>
    );
  };

  const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="mb-10">
      <h2 className="text-5xl font-black mb-3">{children}</h2>
      <div
        className="h-2 w-24"
        style={{
          background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`,
        }}
      />
    </div>
  );

  const renderSlideContent = () => {
    switch (slideType) {
      case 'cover':
        return (
          <div
            className="relative flex flex-col items-start justify-end min-h-[400px] p-12 -m-[inherit] overflow-hidden"
            style={{
              margin: `-${spacing.padding}px`,
              background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
            }}
          >
            {/* Decorative circles */}
            <div
              className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-20"
              style={{ backgroundColor: '#fff' }}
            />
            <div
              className="absolute top-1/3 -right-10 w-40 h-40 rounded-full opacity-10"
              style={{ backgroundColor: '#fff' }}
            />

            {brand.logo && (
              <img
                src={brand.logo}
                alt={`${brand.name} logo`}
                className="w-20 h-20 object-contain mb-8 brightness-0 invert"
              />
            )}
            <h1 className="text-7xl font-black text-white leading-none mb-4">
              {brand.name}
            </h1>
            <p className="text-2xl text-white/70 font-light tracking-wide">
              Brand Guidelines
            </p>
          </div>
        );

      case 'strategy':
        return (
          <div>
            <SectionHeading>Brand Strategy</SectionHeading>
            {brand.guidelines?.strategy && (
              <div className="space-y-8">
                <div
                  className="p-8 -mx-4"
                  style={{ backgroundColor: `${primaryColor}10` }}
                >
                  <h3 className="text-xs font-bold uppercase tracking-[0.3em] mb-4" style={{ color: primaryColor }}>
                    Mission
                  </h3>
                  <p className="text-2xl font-light leading-relaxed text-foreground">
                    {brand.guidelines.strategy.mission}
                  </p>
                </div>
                <div
                  className="p-8 -mx-4"
                  style={{ backgroundColor: `${secondaryColor}10` }}
                >
                  <h3 className="text-xs font-bold uppercase tracking-[0.3em] mb-4" style={{ color: secondaryColor }}>
                    Vision
                  </h3>
                  <p className="text-2xl font-light leading-relaxed text-foreground">
                    {brand.guidelines.strategy.vision}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.3em] mb-6" style={{ color: primaryColor }}>
                    Values
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {brand.guidelines.strategy.values?.map((value, index) => (
                      <span
                        key={index}
                        className="px-5 py-3 text-white font-bold text-sm"
                        style={{
                          backgroundColor: index % 2 === 0 ? primaryColor : secondaryColor,
                          transform: `rotate(${index % 2 === 0 ? '-1' : '1'}deg)`,
                        }}
                      >
                        {value}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'logos':
        return (
          <div>
            <SectionHeading>Logo System</SectionHeading>
            {brand.guidelines?.logoSystem && (
              <div className="space-y-8">
                <div className="flex gap-8 items-start">
                  <div className="flex-1">
                    <h3 className="text-xs font-bold uppercase tracking-[0.3em] mb-4" style={{ color: primaryColor }}>
                      Primary Logo
                    </h3>
                    <div
                      className="p-12 flex items-center justify-center"
                      style={{ backgroundColor: `${primaryColor}08` }}
                    >
                      <img
                        src={brand.guidelines.logoSystem.primary?.url || brand.logo}
                        alt="Primary logo"
                        className="max-w-56 max-h-40 object-contain"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-4 italic">
                      {brand.guidelines.logoSystem.primary?.description}
                    </p>
                  </div>
                  <div className="w-2 self-stretch" style={{ backgroundColor: primaryColor }} />
                  <div className="flex-1">
                    <h3 className="text-xs font-bold uppercase tracking-[0.3em] mb-4" style={{ color: secondaryColor }}>
                      Secondary Logo
                    </h3>
                    <div
                      className="p-12 flex items-center justify-center"
                      style={{ backgroundColor: `${secondaryColor}08` }}
                    >
                      <img
                        src={brand.guidelines.logoSystem.secondary?.url || brand.logo}
                        alt="Secondary logo"
                        className="max-w-56 max-h-40 object-contain"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-4 italic">
                      {brand.guidelines.logoSystem.secondary?.description}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'colors':
        return (
          <div>
            <SectionHeading>Color Palette</SectionHeading>
            {brand.guidelines?.colorPalette && (
              <div className="space-y-8">
                <div className="flex gap-6">
                  <div className="flex-1">
                    <div
                      className="h-48 flex items-end p-6"
                      style={{ backgroundColor: brand.guidelines.colorPalette.primary?.hex }}
                    >
                      <div className="text-white">
                        <p className="font-black text-2xl">{brand.guidelines.colorPalette.primary?.name}</p>
                        <p className="font-mono text-sm opacity-80">{brand.guidelines.colorPalette.primary?.hex}</p>
                      </div>
                    </div>
                  </div>
                  {brand.guidelines.colorPalette.secondary && (
                    <div className="flex-1">
                      <div
                        className="h-48 flex items-end p-6"
                        style={{ backgroundColor: brand.guidelines.colorPalette.secondary.hex }}
                      >
                        <div className="text-white">
                          <p className="font-black text-2xl">{brand.guidelines.colorPalette.secondary.name}</p>
                          <p className="font-mono text-sm opacity-80">{brand.guidelines.colorPalette.secondary.hex}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case 'typography':
        return (
          <div>
            <SectionHeading>Typography</SectionHeading>
            {brand.guidelines?.typography && (
              <div className="space-y-10">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.3em] mb-4" style={{ color: primaryColor }}>
                    Primary Typeface
                  </h3>
                  <p
                    className="text-6xl font-black leading-tight mb-2"
                    style={{ fontFamily: brand.guidelines.typography.primary.family }}
                  >
                    {brand.guidelines.typography.primary.family}
                  </p>
                  <p
                    className="text-3xl font-light mb-4"
                    style={{
                      fontFamily: brand.guidelines.typography.primary.family,
                      color: `${primaryColor}80`,
                    }}
                  >
                    Aa Bb Cc Dd Ee Ff Gg
                  </p>
                  <p className="text-muted-foreground italic">{brand.guidelines.typography.primary.usage}</p>
                </div>

                {brand.guidelines.typography.secondary && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.3em] mb-4" style={{ color: secondaryColor }}>
                      Secondary Typeface
                    </h3>
                    <p
                      className="text-6xl font-black leading-tight mb-2"
                      style={{ fontFamily: brand.guidelines.typography.secondary.family }}
                    >
                      {brand.guidelines.typography.secondary.family}
                    </p>
                    <p
                      className="text-3xl font-light mb-4"
                      style={{
                        fontFamily: brand.guidelines.typography.secondary.family,
                        color: `${secondaryColor}80`,
                      }}
                    >
                      Aa Bb Cc Dd Ee Ff Gg
                    </p>
                    <p className="text-muted-foreground italic">{brand.guidelines.typography.secondary.usage}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'voice':
        return (
          <div>
            <SectionHeading>Brand Voice</SectionHeading>
            <div
              className="p-8 -mx-4"
              style={{ backgroundColor: `${primaryColor}10` }}
            >
              <p className="text-xl font-light leading-relaxed text-foreground">
                {slideContent?.description || 'Brand voice and tone guidelines define how the brand communicates across all touchpoints.'}
              </p>
            </div>
          </div>
        );

      case 'iconography':
        return (
          <div>
            <SectionHeading>Iconography</SectionHeading>
            <div
              className="p-8 -mx-4"
              style={{ backgroundColor: `${secondaryColor}10` }}
            >
              <p className="text-xl font-light leading-relaxed text-foreground">
                {slideContent?.description || 'Icon system and usage guidelines.'}
              </p>
            </div>
          </div>
        );

      case 'social':
        return (
          <div>
            <SectionHeading>Social Media</SectionHeading>
            <div
              className="p-8 -mx-4"
              style={{ backgroundColor: `${primaryColor}10` }}
            >
              <p className="text-xl font-light leading-relaxed text-foreground">
                {slideContent?.description || 'Social media brand application guidelines.'}
              </p>
            </div>
          </div>
        );

      case 'stationery':
        return (
          <div>
            <SectionHeading>Stationery</SectionHeading>
            <div
              className="p-8 -mx-4"
              style={{ backgroundColor: `${secondaryColor}10` }}
            >
              <p className="text-xl font-light leading-relaxed text-foreground">
                {slideContent?.description || 'Business cards, letterheads, and stationery guidelines.'}
              </p>
            </div>
          </div>
        );

      case 'applications':
        return (
          <div>
            <SectionHeading>Applications</SectionHeading>
            <div
              className="p-8 -mx-4"
              style={{ backgroundColor: `${primaryColor}10` }}
            >
              <p className="text-xl font-light leading-relaxed text-foreground">
                {slideContent?.description || 'Real-world brand application examples.'}
              </p>
            </div>
          </div>
        );

      case 'language':
        return (
          <div>
            <SectionHeading>Language</SectionHeading>
            <div
              className="p-8 -mx-4"
              style={{ backgroundColor: `${secondaryColor}10` }}
            >
              <p className="text-xl font-light leading-relaxed text-foreground">
                {slideContent?.description || 'Language and terminology guidelines.'}
              </p>
            </div>
          </div>
        );

      default:
        return (
          <div className="py-16">
            <SectionHeading>{slideType}</SectionHeading>
            <p className="text-xl text-muted-foreground font-light">
              Content for {slideType} slide will be displayed here.
            </p>
          </div>
        );
    }
  };

  return (
    <div
      className="bg-background text-foreground min-h-full"
      style={slideStyle}
    >
      {renderHeader()}

      <div className="flex-1">
        {renderSlideContent()}
      </div>

      {renderFooter()}
    </div>
  );
};

export default CreativeTemplate;
