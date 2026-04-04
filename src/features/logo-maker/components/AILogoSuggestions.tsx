import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/shared/design-system';
import { ICON_CATEGORIES } from '../data/icons';
import { COLOR_PRESETS } from '../data/layouts';
import { FONT_OPTIONS } from '../data/layouts';
import type { LogoConfig, LogoLayout, LogoSuggestion } from '../types';
import { LogoCanvas } from './LogoCanvas';
import { DEFAULT_LOGO_CONFIG } from '../types';
import { Sparkles, Wand2, Loader2 } from 'lucide-react';

interface AILogoSuggestionsProps {
  currentConfig: LogoConfig;
  onApply: (updates: Partial<LogoConfig>) => void;
}

/** Keyword-to-category mapping for "AI" suggestions */
const INDUSTRY_MAP: Record<string, string[]> = {
  tech: ['tech', 'shapes'],
  technology: ['tech', 'shapes'],
  software: ['tech', 'shapes'],
  app: ['tech', 'creative'],
  startup: ['tech', 'business'],
  business: ['business', 'finance'],
  finance: ['finance', 'business'],
  bank: ['finance', 'business'],
  food: ['food', 'nature'],
  restaurant: ['food', 'nature'],
  cafe: ['food', 'nature'],
  health: ['health', 'nature'],
  medical: ['health'],
  fitness: ['health'],
  education: ['education'],
  school: ['education'],
  university: ['education'],
  creative: ['creative', 'shapes'],
  design: ['creative', 'shapes'],
  art: ['creative'],
  travel: ['travel', 'nature'],
  nature: ['nature'],
  eco: ['nature'],
  green: ['nature'],
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateSuggestions(description: string, brandName: string): LogoSuggestion[] {
  const words = description.toLowerCase().split(/\s+/);
  const matchedCategories = new Set<string>();

  for (const word of words) {
    const cats = INDUSTRY_MAP[word];
    if (cats) cats.forEach((c) => matchedCategories.add(c));
  }

  // Fallback to a mix if nothing matched
  if (matchedCategories.size === 0) {
    matchedCategories.add('shapes');
    matchedCategories.add('business');
    matchedCategories.add('creative');
  }

  const catArray = Array.from(matchedCategories);
  const relevantIcons: string[] = [];
  for (const catId of catArray) {
    const cat = ICON_CATEGORIES.find((c) => c.id === catId);
    if (cat) relevantIcons.push(...cat.icons);
  }

  const layouts: LogoLayout[] = ['stacked', 'horizontal', 'wordmark', 'badge', 'embedded', 'symbol'];
  const suggestions: LogoSuggestion[] = [];

  for (let i = 0; i < 6; i++) {
    const preset = pickRandom(COLOR_PRESETS);
    const layout = layouts[i % layouts.length];
    const icon = relevantIcons.length > 0 ? pickRandom(relevantIcons) : 'Hexagon';
    const font = pickRandom(FONT_OPTIONS);

    suggestions.push({
      id: `suggestion-${i}`,
      label: `${preset.name} ${layout}`,
      config: {
        icon,
        layout,
        primaryColor: preset.primary,
        secondaryColor: preset.secondary,
        fontFamily: font,
        brandName: brandName || 'Brand',
        showGradient: Math.random() > 0.5,
        gradientAngle: pickRandom([90, 135, 180, 45]),
        textTransform: pickRandom(['none', 'uppercase'] as const[]),
        letterSpacing: layout === 'badge' ? 2 : pickRandom([0, 1, 2, 4]),
        fontSize: pickRandom([28, 32, 36]),
        iconSize: pickRandom([40, 48, 56]),
      },
    });
  }

  return suggestions;
}

export function AILogoSuggestions({ currentConfig, onApply }: AILogoSuggestionsProps) {
  const [description, setDescription] = useState('');
  const [suggestions, setSuggestions] = useState<LogoSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const handleGenerate = useCallback(() => {
    setLoading(true);
    // Simulate async "AI" generation
    setTimeout(() => {
      const results = generateSuggestions(description, currentConfig.brandName);
      setSuggestions(results);
      setLoading(false);
    }, 600);
  }, [description, currentConfig.brandName]);

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" />
          Describe Your Brand
        </Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. modern tech startup, organic food brand..."
          className="h-9 text-sm"
          onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
        />
        <Button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full gap-2"
          size="sm"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Wand2 className="w-4 h-4" />
          )}
          Generate Suggestions
        </Button>
      </div>

      {suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Click a suggestion to apply
          </p>
          <div className="grid grid-cols-2 gap-2">
            {suggestions.map((s) => {
              const mergedConfig: LogoConfig = { ...DEFAULT_LOGO_CONFIG, ...currentConfig, ...s.config };
              return (
                <button
                  key={s.id}
                  onClick={() => onApply(s.config)}
                  className={cn(
                    'flex flex-col items-center p-3 rounded-xl border border-border',
                    'bg-card hover:border-primary/40 hover:shadow-md transition-all',
                    'group cursor-pointer',
                  )}
                >
                  <div className="w-full flex items-center justify-center py-2 overflow-hidden">
                    <LogoCanvas
                      config={mergedConfig}
                      scale={0.4}
                      className="pointer-events-none"
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 truncate w-full text-center group-hover:text-foreground transition-colors">
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
