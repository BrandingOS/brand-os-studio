import React from 'react';
import type { Brand } from '@/shared/types/brand';
import type { GuidelineSettings } from '../types/guidelines';

interface MinimalTemplateProps {
  brand: Brand;
  settings: GuidelineSettings;
  slideContent: any;
  slideType: string;
}

export const MinimalTemplate: React.FC<MinimalTemplateProps> = ({
  brand,
  settings,
  slideContent,
  slideType,
}) => {
  const { spacing, header, footer, language } = settings;

  const slideStyle = {
    padding: `${spacing.padding}px`,
    margin: `${spacing.margins}px`,
    borderRadius: `${spacing.cornerRadius}px`,
    direction: language.direction as 'ltr' | 'rtl',
  };

  const renderHeader = () => {
    if (!header.enabled) return null;

    return (
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-border/20">
        {header.showProjectName && (
          <h1 className="text-lg font-semibold text-foreground">{brand.name}</h1>
        )}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
      <div className="flex justify-between items-center mt-8 pt-4 border-t border-border/20">
        {footer.customText && (
          <span className="text-sm text-muted-foreground">{footer.customText}</span>
        )}
        {footer.showPageNumbers && (
          <span className="text-sm text-muted-foreground">
            Page {slideContent?.pageNumber || 1}
          </span>
        )}
      </div>
    );
  };

  const renderSlideContent = () => {
    switch (slideType) {
      case 'cover':
        return (
          <div className="text-center py-16">
            <h1 className="text-5xl font-bold mb-4">{brand.name}</h1>
            <p className="text-xl text-muted-foreground mb-8">Brand Guidelines</p>
            {brand.logo && (
              <img 
                src={brand.logo} 
                alt={`${brand.name} logo`}
                className="mx-auto w-32 h-32 object-contain"
              />
            )}
          </div>
        );

      case 'strategy':
        return (
          <div>
            <h2 className="text-3xl font-bold mb-8">Brand Strategy</h2>
            {brand.guidelines?.strategy && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-3">Mission</h3>
                  <p className="text-muted-foreground">{brand.guidelines.strategy.mission}</p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-3">Vision</h3>
                  <p className="text-muted-foreground">{brand.guidelines.strategy.vision}</p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-3">Values</h3>
                  <ul className="list-disc list-inside space-y-2">
                    {brand.guidelines.strategy.values?.map((value, index) => (
                      <li key={index} className="text-muted-foreground">{value}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        );

      case 'logos':
        return (
          <div>
            <h2 className="text-3xl font-bold mb-8">Logo System</h2>
            {brand.guidelines?.logoSystem && (
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Primary Logo</h3>
                  <div className="bg-muted p-8 rounded-lg">
                    <img 
                      src={brand.guidelines.logoSystem.primary?.url || brand.logo} 
                      alt="Primary logo"
                      className="w-full max-w-48 mx-auto"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {brand.guidelines.logoSystem.primary?.description}
                  </p>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Secondary Logo</h3>
                  <div className="bg-muted p-8 rounded-lg">
                    <img 
                      src={brand.guidelines.logoSystem.secondary?.url || brand.logo} 
                      alt="Secondary logo"
                      className="w-full max-w-48 mx-auto"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {brand.guidelines.logoSystem.secondary?.description}
                  </p>
                </div>
              </div>
            )}
          </div>
        );

      case 'colors':
        return (
          <div>
            <h2 className="text-3xl font-bold mb-8">Color Palette</h2>
            {brand.guidelines?.colorPalette && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-4">Primary Colors</h3>
                  <div className="flex gap-4">
                    <div className="text-center">
                      <div 
                        className="w-24 h-24 rounded-lg mb-2"
                        style={{ backgroundColor: brand.guidelines.colorPalette.primary?.hex }}
                      />
                      <p className="text-sm font-medium">{brand.guidelines.colorPalette.primary?.name}</p>
                      <p className="text-xs text-muted-foreground">{brand.guidelines.colorPalette.primary?.hex}</p>
                    </div>
                    {brand.guidelines.colorPalette.secondary && (
                      <div className="text-center">
                        <div 
                          className="w-24 h-24 rounded-lg mb-2"
                          style={{ backgroundColor: brand.guidelines.colorPalette.secondary.hex }}
                        />
                        <p className="text-sm font-medium">{brand.guidelines.colorPalette.secondary.name}</p>
                        <p className="text-xs text-muted-foreground">{brand.guidelines.colorPalette.secondary.hex}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'typography':
        return (
          <div>
            <h2 className="text-3xl font-bold mb-8">Typography</h2>
            {brand.guidelines?.typography && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-4">Primary Font</h3>
                  <div className="space-y-2">
                    <p className="text-4xl" style={{ fontFamily: brand.guidelines.typography.primary.family }}>
                      {brand.guidelines.typography.primary.family}
                    </p>
                    <p className="text-muted-foreground">{brand.guidelines.typography.primary.usage}</p>
                  </div>
                </div>
                
                {brand.guidelines.typography.secondary && (
                  <div>
                    <h3 className="text-xl font-semibold mb-4">Secondary Font</h3>
                    <div className="space-y-2">
                      <p className="text-4xl" style={{ fontFamily: brand.guidelines.typography.secondary.family }}>
                        {brand.guidelines.typography.secondary.family}
                      </p>
                      <p className="text-muted-foreground">{brand.guidelines.typography.secondary.usage}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="text-center py-16">
            <h2 className="text-2xl font-semibold mb-4">Slide Content</h2>
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