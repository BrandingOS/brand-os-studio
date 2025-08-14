import React from 'react';
import type { Brand } from '@/shared/types/brand';
import type { GuidelineSettings } from '../types/guidelines';

interface CoverTemplateProps {
  brand: Brand;
  settings: GuidelineSettings;
  slideContent?: any;
  slideType?: string;
}

export const CoverTemplate: React.FC<CoverTemplateProps> = ({
  brand,
  settings,
  slideContent,
}) => {
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div 
      className="relative w-full h-full bg-gradient-to-br from-background via-muted/20 to-muted/40 flex flex-col"
      style={{
        padding: `${settings.spacing.padding}px`,
        fontFamily: brand.fonts?.primary || 'Inter, sans-serif',
      }}
    >
      {/* Header */}
      {settings.header.enabled && (
        <div className="flex justify-between items-start mb-8">
          {settings.header.showProjectName && (
            <div className="text-sm text-muted-foreground">
              {settings.header.customText || 'Brand Guidelines'}
            </div>
          )}
          {settings.header.showDate && (
            <div className="text-sm text-muted-foreground">
              {formattedDate}
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center items-center text-center space-y-8">
        {/* Logo */}
        {brand.logo && (
          <div className="mb-8">
            <img 
              src={brand.logo} 
              alt={`${brand.name} logo`}
              className="w-32 h-32 object-contain mx-auto"
              style={{
                filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1))'
              }}
            />
          </div>
        )}

        {/* Brand Name */}
        <div className="space-y-4">
          <h1 
            className="text-6xl font-bold tracking-tight"
            style={{ 
              color: brand.primaryColor,
              fontFamily: brand.fonts?.secondary || brand.fonts?.primary || 'Inter, sans-serif',
            }}
          >
            {brand.name}
          </h1>
          
          {/* Subtitle */}
          <div className="space-y-2">
            <h2 className="text-2xl font-medium text-foreground">
              Brand Guidelines
            </h2>
            <div 
              className="w-24 h-1 mx-auto rounded-full"
              style={{ backgroundColor: brand.secondaryColor || brand.primaryColor }}
            />
          </div>
        </div>

        {/* Brand Description */}
        {brand.tone && (
          <div className="max-w-2xl">
            <p className="text-lg text-muted-foreground leading-relaxed">
              {brand.tone}
            </p>
          </div>
        )}

        {/* Color Accent */}
        <div className="flex items-center justify-center space-x-3">
          <div 
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: brand.primaryColor }}
          />
          <div 
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: brand.secondaryColor || brand.primaryColor }}
          />
          <div 
            className="w-4 h-4 rounded-full opacity-60"
            style={{ backgroundColor: brand.primaryColor }}
          />
        </div>
      </div>

      {/* Footer */}
      {settings.footer.enabled && (
        <div className="flex justify-between items-end mt-8">
          <div className="text-sm text-muted-foreground">
            {settings.footer.customText || `${brand.name} Brand Guidelines`}
          </div>
          {settings.footer.showPageNumbers && (
            <div className="text-sm text-muted-foreground">
              Page {slideContent?.pageNumber || 1}
            </div>
          )}
        </div>
      )}
    </div>
  );
};