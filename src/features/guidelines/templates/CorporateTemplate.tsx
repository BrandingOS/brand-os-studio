import React from 'react';
import type { Brand } from '@/shared/types/brand';
import type { GuidelineSettings } from '../types/guidelines';

interface CorporateTemplateProps {
  brand: Brand;
  settings: GuidelineSettings;
  slideContent: any;
  slideType: string;
}

export const CorporateTemplate: React.FC<CorporateTemplateProps> = ({
  brand,
  settings,
  slideContent,
  slideType,
}) => {
  const { spacing, header, footer, language } = settings;

  const primaryColor = brand.guidelines?.colorPalette?.primary?.hex || '#1e3a5f';
  const secondaryColor = brand.guidelines?.colorPalette?.secondary?.hex || '#4a6fa5';

  const slideStyle = {
    padding: `${spacing.padding}px`,
    margin: `${spacing.margins}px`,
    borderRadius: `${spacing.cornerRadius}px`,
    direction: language.direction as 'ltr' | 'rtl',
  };

  const renderHeader = () => {
    if (!header.enabled) return null;

    return (
      <div
        className="flex justify-between items-center mb-8 px-6 py-3"
        style={{ backgroundColor: primaryColor }}
      >
        {header.showProjectName && (
          <h1 className="text-lg font-bold tracking-wide uppercase text-white">
            {brand.name}
          </h1>
        )}
        <div className="flex items-center gap-6 text-sm text-white/80">
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
      <div
        className="flex justify-between items-center mt-8 px-6 py-3 border-t-2"
        style={{ borderColor: primaryColor }}
      >
        {footer.customText && (
          <span className="text-sm text-muted-foreground font-medium">{footer.customText}</span>
        )}
        {footer.showPageNumbers && (
          <span className="text-sm font-semibold" style={{ color: primaryColor }}>
            Page {slideContent?.pageNumber || 1}
          </span>
        )}
      </div>
    );
  };

  const SectionFrame: React.FC<{ title?: string; children: React.ReactNode; className?: string }> = ({
    title,
    children,
    className = '',
  }) => (
    <div
      className={`border-2 ${className}`}
      style={{ borderColor: `${primaryColor}30` }}
    >
      {title && (
        <div
          className="px-4 py-2 border-b"
          style={{ backgroundColor: `${primaryColor}08`, borderColor: `${primaryColor}30` }}
        >
          <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: primaryColor }}>
            {title}
          </h3>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );

  const renderSlideContent = () => {
    switch (slideType) {
      case 'cover':
        return (
          <div className="flex flex-col items-center justify-center py-16">
            <div
              className="w-full py-12 px-8 text-center mb-8"
              style={{ backgroundColor: primaryColor }}
            >
              {brand.logo && (
                <img
                  src={brand.logo}
                  alt={`${brand.name} logo`}
                  className="mx-auto w-24 h-24 object-contain mb-6"
                />
              )}
              <h1 className="text-5xl font-bold tracking-tight text-white mb-2">
                {brand.name}
              </h1>
              <div className="w-16 h-1 bg-white/40 mx-auto mt-4" />
            </div>
            <p
              className="text-xl font-semibold uppercase tracking-[0.3em]"
              style={{ color: primaryColor }}
            >
              Brand Guidelines
            </p>
          </div>
        );

      case 'strategy':
        return (
          <div>
            <h2
              className="text-3xl font-bold mb-2 uppercase tracking-wide"
              style={{ color: primaryColor }}
            >
              Brand Strategy
            </h2>
            <div className="w-12 h-1 mb-8" style={{ backgroundColor: primaryColor }} />
            {brand.guidelines?.strategy && (
              <div className="grid grid-cols-2 gap-6">
                <SectionFrame title="Mission">
                  <p className="text-muted-foreground leading-relaxed">
                    {brand.guidelines.strategy.mission}
                  </p>
                </SectionFrame>
                <SectionFrame title="Vision">
                  <p className="text-muted-foreground leading-relaxed">
                    {brand.guidelines.strategy.vision}
                  </p>
                </SectionFrame>
                <div className="col-span-2">
                  <SectionFrame title="Core Values">
                    <div className="grid grid-cols-2 gap-3">
                      {brand.guidelines.strategy.values?.map((value, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 py-2 px-3"
                          style={{ backgroundColor: `${primaryColor}06` }}
                        >
                          <span
                            className="w-6 h-6 rounded-sm flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: primaryColor }}
                          >
                            {index + 1}
                          </span>
                          <span className="text-muted-foreground font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </SectionFrame>
                </div>
              </div>
            )}
          </div>
        );

      case 'logos':
        return (
          <div>
            <h2
              className="text-3xl font-bold mb-2 uppercase tracking-wide"
              style={{ color: primaryColor }}
            >
              Logo System
            </h2>
            <div className="w-12 h-1 mb-8" style={{ backgroundColor: primaryColor }} />
            {brand.guidelines?.logoSystem && (
              <div className="grid grid-cols-2 gap-6">
                <SectionFrame title="Primary Logo">
                  <div className="bg-muted p-8 flex items-center justify-center mb-4">
                    <img
                      src={brand.guidelines.logoSystem.primary?.url || brand.logo}
                      alt="Primary logo"
                      className="max-w-48 max-h-32 object-contain"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {brand.guidelines.logoSystem.primary?.description}
                  </p>
                </SectionFrame>
                <SectionFrame title="Secondary Logo">
                  <div className="bg-muted p-8 flex items-center justify-center mb-4">
                    <img
                      src={brand.guidelines.logoSystem.secondary?.url || brand.logo}
                      alt="Secondary logo"
                      className="max-w-48 max-h-32 object-contain"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {brand.guidelines.logoSystem.secondary?.description}
                  </p>
                </SectionFrame>
              </div>
            )}
          </div>
        );

      case 'colors':
        return (
          <div>
            <h2
              className="text-3xl font-bold mb-2 uppercase tracking-wide"
              style={{ color: primaryColor }}
            >
              Color Palette
            </h2>
            <div className="w-12 h-1 mb-8" style={{ backgroundColor: primaryColor }} />
            {brand.guidelines?.colorPalette && (
              <div className="grid grid-cols-2 gap-6">
                <SectionFrame title="Primary Color">
                  <div
                    className="w-full h-28 mb-4"
                    style={{ backgroundColor: brand.guidelines.colorPalette.primary?.hex }}
                  />
                  <div className="flex justify-between items-center">
                    <p className="font-semibold">{brand.guidelines.colorPalette.primary?.name}</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      {brand.guidelines.colorPalette.primary?.hex}
                    </p>
                  </div>
                </SectionFrame>
                {brand.guidelines.colorPalette.secondary && (
                  <SectionFrame title="Secondary Color">
                    <div
                      className="w-full h-28 mb-4"
                      style={{ backgroundColor: brand.guidelines.colorPalette.secondary.hex }}
                    />
                    <div className="flex justify-between items-center">
                      <p className="font-semibold">{brand.guidelines.colorPalette.secondary.name}</p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {brand.guidelines.colorPalette.secondary.hex}
                      </p>
                    </div>
                  </SectionFrame>
                )}
              </div>
            )}
          </div>
        );

      case 'typography':
        return (
          <div>
            <h2
              className="text-3xl font-bold mb-2 uppercase tracking-wide"
              style={{ color: primaryColor }}
            >
              Typography
            </h2>
            <div className="w-12 h-1 mb-8" style={{ backgroundColor: primaryColor }} />
            {brand.guidelines?.typography && (
              <div className="grid grid-cols-2 gap-6">
                <SectionFrame title="Primary Typeface">
                  <p
                    className="text-4xl mb-3"
                    style={{ fontFamily: brand.guidelines.typography.primary.family }}
                  >
                    {brand.guidelines.typography.primary.family}
                  </p>
                  <p className="text-sm text-muted-foreground border-t pt-3" style={{ borderColor: `${primaryColor}20` }}>
                    {brand.guidelines.typography.primary.usage}
                  </p>
                </SectionFrame>
                {brand.guidelines.typography.secondary && (
                  <SectionFrame title="Secondary Typeface">
                    <p
                      className="text-4xl mb-3"
                      style={{ fontFamily: brand.guidelines.typography.secondary.family }}
                    >
                      {brand.guidelines.typography.secondary.family}
                    </p>
                    <p className="text-sm text-muted-foreground border-t pt-3" style={{ borderColor: `${primaryColor}20` }}>
                      {brand.guidelines.typography.secondary.usage}
                    </p>
                  </SectionFrame>
                )}
              </div>
            )}
          </div>
        );

      case 'voice':
        return (
          <div>
            <h2
              className="text-3xl font-bold mb-2 uppercase tracking-wide"
              style={{ color: primaryColor }}
            >
              Brand Voice
            </h2>
            <div className="w-12 h-1 mb-8" style={{ backgroundColor: primaryColor }} />
            <SectionFrame title="Tone & Messaging">
              <p className="text-muted-foreground leading-relaxed">
                {slideContent?.description || 'Brand voice and tone guidelines define how the brand communicates across all touchpoints.'}
              </p>
            </SectionFrame>
          </div>
        );

      case 'iconography':
        return (
          <div>
            <h2
              className="text-3xl font-bold mb-2 uppercase tracking-wide"
              style={{ color: primaryColor }}
            >
              Iconography
            </h2>
            <div className="w-12 h-1 mb-8" style={{ backgroundColor: primaryColor }} />
            <SectionFrame title="Icon System">
              <p className="text-muted-foreground leading-relaxed">
                {slideContent?.description || 'Icon system and usage guidelines.'}
              </p>
            </SectionFrame>
          </div>
        );

      case 'social':
        return (
          <div>
            <h2
              className="text-3xl font-bold mb-2 uppercase tracking-wide"
              style={{ color: primaryColor }}
            >
              Social Media
            </h2>
            <div className="w-12 h-1 mb-8" style={{ backgroundColor: primaryColor }} />
            <SectionFrame title="Social Guidelines">
              <p className="text-muted-foreground leading-relaxed">
                {slideContent?.description || 'Social media brand application guidelines.'}
              </p>
            </SectionFrame>
          </div>
        );

      case 'stationery':
        return (
          <div>
            <h2
              className="text-3xl font-bold mb-2 uppercase tracking-wide"
              style={{ color: primaryColor }}
            >
              Stationery
            </h2>
            <div className="w-12 h-1 mb-8" style={{ backgroundColor: primaryColor }} />
            <SectionFrame title="Stationery System">
              <p className="text-muted-foreground leading-relaxed">
                {slideContent?.description || 'Business cards, letterheads, and stationery guidelines.'}
              </p>
            </SectionFrame>
          </div>
        );

      case 'applications':
        return (
          <div>
            <h2
              className="text-3xl font-bold mb-2 uppercase tracking-wide"
              style={{ color: primaryColor }}
            >
              Applications
            </h2>
            <div className="w-12 h-1 mb-8" style={{ backgroundColor: primaryColor }} />
            <SectionFrame title="Brand Applications">
              <p className="text-muted-foreground leading-relaxed">
                {slideContent?.description || 'Real-world brand application examples.'}
              </p>
            </SectionFrame>
          </div>
        );

      case 'language':
        return (
          <div>
            <h2
              className="text-3xl font-bold mb-2 uppercase tracking-wide"
              style={{ color: primaryColor }}
            >
              Language
            </h2>
            <div className="w-12 h-1 mb-8" style={{ backgroundColor: primaryColor }} />
            <SectionFrame title="Language Guidelines">
              <p className="text-muted-foreground leading-relaxed">
                {slideContent?.description || 'Language and terminology guidelines.'}
              </p>
            </SectionFrame>
          </div>
        );

      default:
        return (
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold uppercase tracking-wide" style={{ color: primaryColor }}>
              {slideType}
            </h2>
            <div className="w-12 h-1 mx-auto mt-2 mb-4" style={{ backgroundColor: primaryColor }} />
            <p className="text-muted-foreground">Content for {slideType} slide will be displayed here.</p>
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

export default CorporateTemplate;
