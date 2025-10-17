import { Brand } from '@/shared/types/brand';
import { Card } from '@/components/ui/card';

interface BrandBoardProps {
  brand: Brand;
  className?: string;
}

export function BrandBoard({ brand, className = '' }: BrandBoardProps) {
  const guidelines = brand.guidelines;
  const logoSystem = guidelines?.logoSystem;
  const colorPalette = guidelines?.colorPalette;
  const fonts = brand.fonts || { primary: '', secondary: '' };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Primary Logo Section */}
      <Card className="p-8 bg-background">
        <div className="text-center space-y-4">
          <div className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
            Primary Logo
          </div>
          {logoSystem.primary?.url || brand.logo ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <img 
                src={logoSystem.primary?.url || brand.logo} 
                alt="Primary Logo" 
                className="max-h-[180px] max-w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
              No primary logo uploaded
            </div>
          )}
        </div>
      </Card>

      {/* Logo Variants */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { key: 'wordmark', label: 'Wordmark' },
          { key: 'iconmark', label: 'Iconmark' },
          { key: 'secondary', label: 'Secondary' }
        ].map((variant) => (
          <Card key={variant.key} className="p-6 bg-muted/30">
            <div className="space-y-3">
              <div className="text-xs font-semibold text-muted-foreground tracking-wider uppercase text-center">
                {variant.label}
              </div>
              {logoSystem?.[variant.key as keyof typeof logoSystem] && 
               typeof logoSystem[variant.key as keyof typeof logoSystem] === 'object' &&
               !Array.isArray(logoSystem[variant.key as keyof typeof logoSystem]) &&
               logoSystem[variant.key as keyof typeof logoSystem] !== null &&
               'url' in (logoSystem[variant.key as keyof typeof logoSystem] as any) ? (
                <div className="flex items-center justify-center min-h-[100px]">
                  <img 
                    src={(logoSystem[variant.key as keyof typeof logoSystem] as any).url} 
                    alt={variant.label}
                    className="max-h-[90px] max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center min-h-[100px] text-muted-foreground text-xs">
                  Not set
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Color Palette */}
      <Card className="p-8 bg-background">
        <div className="space-y-6">
          <div className="text-xs font-semibold text-muted-foreground tracking-wider uppercase text-center">
            Color Palette
          </div>
          <div className="grid grid-cols-5 gap-4">
            {colorPalette.primary ? (
              <>
                <div className="space-y-2">
                  <div 
                    className="aspect-square rounded-lg border-2 border-border"
                    style={{ backgroundColor: colorPalette.primary.hex }}
                  />
                  <div className="text-center">
                    <div className="text-xs font-medium">{colorPalette.primary.name}</div>
                    <div className="text-xs text-muted-foreground">{colorPalette.primary.hex}</div>
                  </div>
                </div>
                {colorPalette.secondary && (
                  <div className="space-y-2">
                    <div 
                      className="aspect-square rounded-lg border-2 border-border"
                      style={{ backgroundColor: colorPalette.secondary.hex }}
                    />
                    <div className="text-center">
                      <div className="text-xs font-medium">{colorPalette.secondary.name}</div>
                      <div className="text-xs text-muted-foreground">{colorPalette.secondary.hex}</div>
                    </div>
                  </div>
                )}
                {colorPalette.accent && (
                  <div className="space-y-2">
                    <div 
                      className="aspect-square rounded-lg border-2 border-border"
                      style={{ backgroundColor: colorPalette.accent.hex }}
                    />
                    <div className="text-center">
                      <div className="text-xs font-medium">{colorPalette.accent.name}</div>
                      <div className="text-xs text-muted-foreground">{colorPalette.accent.hex}</div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <div 
                    className="aspect-square rounded-lg border-2 border-border"
                    style={{ backgroundColor: brand.primaryColor }}
                  />
                  <div className="text-center">
                    <div className="text-xs font-medium">Primary</div>
                    <div className="text-xs text-muted-foreground">{brand.primaryColor}</div>
                  </div>
                </div>
                {brand.secondaryColor && (
                  <div className="space-y-2">
                    <div 
                      className="aspect-square rounded-lg border-2 border-border"
                      style={{ backgroundColor: brand.secondaryColor }}
                    />
                    <div className="text-center">
                      <div className="text-xs font-medium">Secondary</div>
                      <div className="text-xs text-muted-foreground">{brand.secondaryColor}</div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Typography */}
      <Card className="p-8 bg-primary text-primary-foreground">
        <div className="space-y-6">
          <div className="text-xs font-semibold tracking-wider uppercase text-center opacity-80">
            Typography
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <div className="text-xs opacity-80">Primary Font</div>
              <div 
                className="text-6xl font-bold"
                style={{ fontFamily: fonts.primary || 'inherit' }}
              >
                Aa
              </div>
              <div className="text-sm opacity-80">{fonts.primary || 'Default'}</div>
            </div>
            <div className="space-y-2">
              <div className="text-xs opacity-80">Secondary Font</div>
              <div 
                className="text-6xl"
                style={{ fontFamily: fonts.secondary || 'inherit' }}
              >
                Aa
              </div>
              <div className="text-sm opacity-80">{fonts.secondary || 'Default'}</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
