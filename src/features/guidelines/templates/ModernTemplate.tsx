import React from 'react';
import type { Brand } from '@/shared/types/brand';
import type { GuidelineSettings } from '../types/guidelines';

interface ModernTemplateProps {
  brand: Brand;
  settings: GuidelineSettings;
  slideContent: any;
  slideType: string;
}

export const ModernTemplate: React.FC<ModernTemplateProps> = ({
  brand,
  settings,
  slideContent,
  slideType,
}) => {
  const { spacing, header, footer, language } = settings;

  const primaryColor = brand.guidelines?.colorPalette?.primary?.hex || '#6366f1';
  const secondaryColor = brand.guidelines?.colorPalette?.secondary?.hex || '#8b5cf6';

  const slideStyle = {
    padding: `${spacing.padding}px`,
    margin: `${spacing.margins}px`,
    borderRadius: `${spacing.cornerRadius}px`,
    direction: language.direction as 'ltr' | 'rtl',
  };

  const renderHeader = () => {
    if (!header.enabled) return null;

    return (
      <div className="flex justify-between items-center mb-10 pb-4">
        {header.showProjectName && (
          <h1 className="text-sm font-mono font-semibold tracking-widest uppercase text-muted-foreground">
            <span
              className="inline-block w-2 h-2 rounded-full mr-2 align-middle"
              style={{ backgroundColor: primaryColor }}
            />
            {brand.name}
          </h1>
        )}
        <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
          {header.showDate && (
            <span className="px-2 py-1 rounded-md bg-muted">{new Date().toLocaleDateString()}</span>
          )}
          {header.customText && (
            <span className="px-2 py-1 rounded-md bg-muted">{header.customText}</span>
          )}
        </div>
      </div>
    );
  };

  const renderFooter = () => {
    if (!footer.enabled) return null;

    return (
      <div className="flex justify-between items-center mt-10 pt-4">
        {footer.customText && (
          <span className="text-xs font-mono text-muted-foreground">{footer.customText}</span>
        )}
        {footer.showPageNumbers && (
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-muted text-muted-foreground">
            {slideContent?.pageNumber || 1}
          </span>
        )}
      </div>
    );
  };

  const Card: React.FC<{ children: React.ReactNode; className?: string; accent?: boolean }> = ({
    children,
    className = '',
    accent = false,
  }) => (
    <div
      className={`rounded-2xl p-6 ${className}`}
      style={{
        backgroundColor: accent ? `${primaryColor}08` : 'var(--muted)',
        border: `1px solid ${accent ? `${primaryColor}20` : 'var(--border)'}`,
      }}
    >
      {children}
    </div>
  );

  const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span
      className="inline-block text-[10px] font-mono font-bold uppercase tracking-[0.25em] px-3 py-1 rounded-full mb-4"
      style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
    >
      {children}
    </span>
  );

  const renderSlideContent = () => {
    switch (slideType) {
      case 'cover':
        return (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-8"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
              }}
            >
              {brand.logo ? (
                <img
                  src={brand.logo}
                  alt={`${brand.name} logo`}
                  className="w-12 h-12 object-contain brightness-0 invert"
                />
              ) : (
                <span className="text-3xl font-black text-white">
                  {brand.name.charAt(0)}
                </span>
              )}
            </div>
            <h1 className="text-5xl font-bold tracking-tight mb-3">{brand.name}</h1>
            <p className="text-lg text-muted-foreground font-light mb-8">Brand Guidelines</p>
            <div className="flex gap-2">
              <div className="w-8 h-1 rounded-full" style={{ backgroundColor: primaryColor }} />
              <div className="w-8 h-1 rounded-full" style={{ backgroundColor: secondaryColor, opacity: 0.5 }} />
              <div className="w-8 h-1 rounded-full" style={{ backgroundColor: primaryColor, opacity: 0.25 }} />
            </div>
          </div>
        );

      case 'strategy':
        return (
          <div>
            <SectionLabel>Strategy</SectionLabel>
            <h2 className="text-3xl font-bold tracking-tight mb-8">Brand Strategy</h2>
            {brand.guidelines?.strategy && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card accent>
                    <h3 className="text-xs font-mono font-bold uppercase tracking-widest mb-3" style={{ color: primaryColor }}>
                      Mission
                    </h3>
                    <p className="text-foreground leading-relaxed">
                      {brand.guidelines.strategy.mission}
                    </p>
                  </Card>
                  <Card accent>
                    <h3 className="text-xs font-mono font-bold uppercase tracking-widest mb-3" style={{ color: primaryColor }}>
                      Vision
                    </h3>
                    <p className="text-foreground leading-relaxed">
                      {brand.guidelines.strategy.vision}
                    </p>
                  </Card>
                </div>
                <Card>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest mb-4" style={{ color: primaryColor }}>
                    Values
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {brand.guidelines.strategy.values?.map((value, index) => (
                      <span
                        key={index}
                        className="px-4 py-2 rounded-full text-sm font-medium"
                        style={{
                          backgroundColor: `${primaryColor}12`,
                          color: primaryColor,
                          border: `1px solid ${primaryColor}25`,
                        }}
                      >
                        {value}
                      </span>
                    ))}
                  </div>
                </Card>
              </div>
            )}
          </div>
        );

      case 'logos':
        return (
          <div>
            <SectionLabel>Identity</SectionLabel>
            <h2 className="text-3xl font-bold tracking-tight mb-8">Logo System</h2>
            {brand.guidelines?.logoSystem && (
              <div className="grid grid-cols-2 gap-4">
                <Card accent>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest mb-4" style={{ color: primaryColor }}>
                    Primary Logo
                  </h3>
                  <div className="bg-background rounded-xl p-8 flex items-center justify-center mb-4">
                    <img
                      src={brand.guidelines.logoSystem.primary?.url || brand.logo}
                      alt="Primary logo"
                      className="max-w-48 max-h-32 object-contain"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {brand.guidelines.logoSystem.primary?.description}
                  </p>
                </Card>
                <Card accent>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest mb-4" style={{ color: primaryColor }}>
                    Secondary Logo
                  </h3>
                  <div className="bg-background rounded-xl p-8 flex items-center justify-center mb-4">
                    <img
                      src={brand.guidelines.logoSystem.secondary?.url || brand.logo}
                      alt="Secondary logo"
                      className="max-w-48 max-h-32 object-contain"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {brand.guidelines.logoSystem.secondary?.description}
                  </p>
                </Card>
              </div>
            )}
          </div>
        );

      case 'colors':
        return (
          <div>
            <SectionLabel>Palette</SectionLabel>
            <h2 className="text-3xl font-bold tracking-tight mb-8">Color Palette</h2>
            {brand.guidelines?.colorPalette && (
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <div
                    className="w-full h-32 rounded-xl mb-4"
                    style={{
                      background: `linear-gradient(135deg, ${brand.guidelines.colorPalette.primary?.hex}, ${brand.guidelines.colorPalette.primary?.hex}cc)`,
                    }}
                  />
                  <div className="flex justify-between items-baseline">
                    <p className="font-semibold">{brand.guidelines.colorPalette.primary?.name}</p>
                    <p className="text-xs font-mono text-muted-foreground px-2 py-1 rounded-md bg-background">
                      {brand.guidelines.colorPalette.primary?.hex}
                    </p>
                  </div>
                </Card>
                {brand.guidelines.colorPalette.secondary && (
                  <Card>
                    <div
                      className="w-full h-32 rounded-xl mb-4"
                      style={{
                        background: `linear-gradient(135deg, ${brand.guidelines.colorPalette.secondary.hex}, ${brand.guidelines.colorPalette.secondary.hex}cc)`,
                      }}
                    />
                    <div className="flex justify-between items-baseline">
                      <p className="font-semibold">{brand.guidelines.colorPalette.secondary.name}</p>
                      <p className="text-xs font-mono text-muted-foreground px-2 py-1 rounded-md bg-background">
                        {brand.guidelines.colorPalette.secondary.hex}
                      </p>
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>
        );

      case 'typography':
        return (
          <div>
            <SectionLabel>Type</SectionLabel>
            <h2 className="text-3xl font-bold tracking-tight mb-8">Typography</h2>
            {brand.guidelines?.typography && (
              <div className="space-y-4">
                <Card accent>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest mb-4" style={{ color: primaryColor }}>
                    Primary Typeface
                  </h3>
                  <p
                    className="text-4xl font-bold mb-1"
                    style={{ fontFamily: brand.guidelines.typography.primary.family }}
                  >
                    {brand.guidelines.typography.primary.family}
                  </p>
                  <p
                    className="text-xl text-muted-foreground mb-4 font-mono"
                    style={{ fontFamily: brand.guidelines.typography.primary.family }}
                  >
                    ABCDEFGHIJKLM 0123456789
                  </p>
                  <p className="text-sm text-muted-foreground">{brand.guidelines.typography.primary.usage}</p>
                </Card>

                {brand.guidelines.typography.secondary && (
                  <Card accent>
                    <h3 className="text-xs font-mono font-bold uppercase tracking-widest mb-4" style={{ color: primaryColor }}>
                      Secondary Typeface
                    </h3>
                    <p
                      className="text-4xl font-bold mb-1"
                      style={{ fontFamily: brand.guidelines.typography.secondary.family }}
                    >
                      {brand.guidelines.typography.secondary.family}
                    </p>
                    <p
                      className="text-xl text-muted-foreground mb-4 font-mono"
                      style={{ fontFamily: brand.guidelines.typography.secondary.family }}
                    >
                      ABCDEFGHIJKLM 0123456789
                    </p>
                    <p className="text-sm text-muted-foreground">{brand.guidelines.typography.secondary.usage}</p>
                  </Card>
                )}
              </div>
            )}
          </div>
        );

      case 'voice':
        return (
          <div>
            <SectionLabel>Voice</SectionLabel>
            <h2 className="text-3xl font-bold tracking-tight mb-8">Brand Voice</h2>
            <Card accent>
              <p className="text-foreground leading-relaxed">
                {slideContent?.description || 'Brand voice and tone guidelines define how the brand communicates across all touchpoints.'}
              </p>
            </Card>
          </div>
        );

      case 'iconography':
        return (
          <div>
            <SectionLabel>Icons</SectionLabel>
            <h2 className="text-3xl font-bold tracking-tight mb-8">Iconography</h2>
            <Card accent>
              <p className="text-foreground leading-relaxed">
                {slideContent?.description || 'Icon system and usage guidelines.'}
              </p>
            </Card>
          </div>
        );

      case 'social':
        return (
          <div>
            <SectionLabel>Social</SectionLabel>
            <h2 className="text-3xl font-bold tracking-tight mb-8">Social Media</h2>
            <Card accent>
              <p className="text-foreground leading-relaxed">
                {slideContent?.description || 'Social media brand application guidelines.'}
              </p>
            </Card>
          </div>
        );

      case 'stationery':
        return (
          <div>
            <SectionLabel>Print</SectionLabel>
            <h2 className="text-3xl font-bold tracking-tight mb-8">Stationery</h2>
            <Card accent>
              <p className="text-foreground leading-relaxed">
                {slideContent?.description || 'Business cards, letterheads, and stationery guidelines.'}
              </p>
            </Card>
          </div>
        );

      case 'applications':
        return (
          <div>
            <SectionLabel>Usage</SectionLabel>
            <h2 className="text-3xl font-bold tracking-tight mb-8">Applications</h2>
            <Card accent>
              <p className="text-foreground leading-relaxed">
                {slideContent?.description || 'Real-world brand application examples.'}
              </p>
            </Card>
          </div>
        );

      case 'language':
        return (
          <div>
            <SectionLabel>Copy</SectionLabel>
            <h2 className="text-3xl font-bold tracking-tight mb-8">Language</h2>
            <Card accent>
              <p className="text-foreground leading-relaxed">
                {slideContent?.description || 'Language and terminology guidelines.'}
              </p>
            </Card>
          </div>
        );

      default:
        return (
          <div className="text-center py-16">
            <SectionLabel>{slideType}</SectionLabel>
            <h2 className="text-2xl font-bold tracking-tight mb-4">{slideType}</h2>
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

export default ModernTemplate;
