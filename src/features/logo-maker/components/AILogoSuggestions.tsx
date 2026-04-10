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

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const LAYOUTS: LogoLayout[] = ['stacked', 'horizontal', 'wordmark', 'badge', 'embedded', 'symbol'];

function getApiKey(): string | undefined {
  return (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_ANTHROPIC_API_KEY;
}

/** Keyword-to-category mapping for fallback suggestions */
const INDUSTRY_MAP: Record<string, string[]> = {
  tech: ['tech', 'shapes'], technology: ['tech', 'shapes'], software: ['tech', 'shapes'],
  app: ['tech', 'creative'], startup: ['tech', 'business'], business: ['business', 'finance'],
  finance: ['finance', 'business'], bank: ['finance', 'business'],
  food: ['food', 'nature'], restaurant: ['food', 'nature'], cafe: ['food', 'nature'],
  health: ['health', 'nature'], medical: ['health'], fitness: ['health'],
  education: ['education'], school: ['education'], university: ['education'],
  creative: ['creative', 'shapes'], design: ['creative', 'shapes'], art: ['creative'],
  travel: ['travel', 'nature'], nature: ['nature'], eco: ['nature'], green: ['nature'],
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getAllIcons(): string[] {
  return ICON_CATEGORIES.flatMap((c) => c.icons);
}

/** Generate suggestions using Claude for smarter design parameters */
async function generateAISuggestions(description: string, brandName: string): Promise<LogoSuggestion[] | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const allIcons = getAllIcons();
    const iconSample = allIcons.slice(0, 60).join(', ');

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: `You are a brand design expert. Given a brand description, suggest 6 logo design variations. Each variation should have different visual parameters.

Available icon names (Lucide icons): ${iconSample}
Available layouts: ${LAYOUTS.join(', ')}
Available fonts: ${FONT_OPTIONS.join(', ')}

Return ONLY a JSON array of 6 objects, each with:
- icon: string (icon name from the list)
- layout: string (one of the layouts)
- primaryColor: string (hex color)
- secondaryColor: string (hex color)
- fontFamily: string (one of the fonts)
- showGradient: boolean
- textTransform: "none" | "uppercase"
- letterSpacing: number (0-4)
- label: string (short 2-3 word style description)

Make each suggestion visually distinct. Match colors and style to the brand description. Return valid JSON array, nothing else.`,
        messages: [{ role: 'user', content: `Brand: "${brandName}". Description: ${description}` }],
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const text = data.content?.[0]?.text;
    if (!text) return null;

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return null;

    const suggestions = JSON.parse(jsonMatch[0]) as Array<Record<string, any>>;
    return suggestions.map((s, i) => ({
      id: `ai-suggestion-${i}`,
      label: s.label || `Style ${i + 1}`,
      config: {
        icon: allIcons.includes(s.icon) ? s.icon : pickRandom(allIcons),
        layout: (LAYOUTS.includes(s.layout) ? s.layout : LAYOUTS[i % LAYOUTS.length]) as LogoLayout,
        primaryColor: s.primaryColor || '#000000',
        secondaryColor: s.secondaryColor || '#666666',
        fontFamily: FONT_OPTIONS.includes(s.fontFamily) ? s.fontFamily : pickRandom(FONT_OPTIONS),
        brandName: brandName || 'Brand',
        showGradient: !!s.showGradient,
        gradientAngle: pickRandom([90, 135, 180, 45]),
        textTransform: s.textTransform === 'uppercase' ? 'uppercase' as const : 'none' as const,
        letterSpacing: typeof s.letterSpacing === 'number' ? s.letterSpacing : 0,
        fontSize: pickRandom([28, 32, 36]),
        iconSize: pickRandom([40, 48, 56]),
      },
    }));
  } catch {
    return null;
  }
}

/** Fallback: keyword-based mock suggestions */
function generateFallbackSuggestions(description: string, brandName: string): LogoSuggestion[] {
  const words = description.toLowerCase().split(/\s+/);
  const matchedCategories = new Set<string>();

  for (const word of words) {
    const cats = INDUSTRY_MAP[word];
    if (cats) cats.forEach((c) => matchedCategories.add(c));
  }

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

  const suggestions: LogoSuggestion[] = [];
  for (let i = 0; i < 6; i++) {
    const preset = pickRandom(COLOR_PRESETS);
    const layout = LAYOUTS[i % LAYOUTS.length];
    const icon = relevantIcons.length > 0 ? pickRandom(relevantIcons) : 'Hexagon';
    const font = pickRandom(FONT_OPTIONS);

    suggestions.push({
      id: `suggestion-${i}`,
      label: `${preset.name} ${layout}`,
      config: {
        icon, layout, primaryColor: preset.primary, secondaryColor: preset.secondary,
        fontFamily: font, brandName: brandName || 'Brand',
        showGradient: Math.random() > 0.5, gradientAngle: pickRandom([90, 135, 180, 45]),
        textTransform: pickRandom(['none', 'uppercase'] as const),
        letterSpacing: layout === 'badge' ? 2 : pickRandom([0, 1, 2, 4]),
        fontSize: pickRandom([28, 32, 36]), iconSize: pickRandom([40, 48, 56]),
      },
    });
  }

  return suggestions;
}

export function AILogoSuggestions({ currentConfig, onApply }: AILogoSuggestionsProps) {
  const [description, setDescription] = useState('');
  const [suggestions, setSuggestions] = useState<LogoSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    try {
      // Try AI-powered suggestions first
      const aiSuggestions = await generateAISuggestions(description, currentConfig.brandName);
      if (aiSuggestions && aiSuggestions.length > 0) {
        setSuggestions(aiSuggestions);
      } else {
        // Fall back to keyword-based generation
        setSuggestions(generateFallbackSuggestions(description, currentConfig.brandName));
      }
    } catch {
      setSuggestions(generateFallbackSuggestions(description, currentConfig.brandName));
    } finally {
      setLoading(false);
    }
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
          {getApiKey() ? 'Generate with AI' : 'Generate Suggestions'}
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
