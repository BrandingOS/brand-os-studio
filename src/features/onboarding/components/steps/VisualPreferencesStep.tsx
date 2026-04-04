import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { AIAssistBox, type ParsedField } from '../AIAssistBox';
import { parseVisualPreferences } from '../../utils/aiParsers';
import { Plus, Trash2 } from 'lucide-react';

interface VisualPreferencesStepProps {
  value?: any;
  stepId: string;
}

const COLOR_MOODS = [
  { value: 'warm', label: 'Warm', desc: 'Reds, oranges, yellows', swatch: '#f97316' },
  { value: 'cool', label: 'Cool', desc: 'Blues, teals, greens', swatch: '#0ea5e9' },
  { value: 'neutral', label: 'Neutral', desc: 'Grays, beiges, blacks', swatch: '#737373' },
  { value: 'vibrant', label: 'Vibrant', desc: 'Bright, saturated hues', swatch: '#a855f7' },
  { value: 'muted', label: 'Muted', desc: 'Soft, desaturated tones', swatch: '#94a3b8' },
  { value: 'pastel', label: 'Pastel', desc: 'Light, gentle tones', swatch: '#f9a8d4' },
  { value: 'dark', label: 'Dark', desc: 'Deep, dramatic colors', swatch: '#1e293b' },
  { value: 'earthy', label: 'Earthy', desc: 'Browns, greens, terracotta', swatch: '#92400e' },
];

const VISUAL_STYLES = [
  { value: 'minimalist', label: 'Minimalist', desc: 'Clean, simple, white space' },
  { value: 'modern', label: 'Modern', desc: 'Sleek, contemporary, geometric' },
  { value: 'playful', label: 'Playful', desc: 'Fun, colorful, energetic' },
  { value: 'elegant', label: 'Elegant', desc: 'Sophisticated, refined, luxury' },
  { value: 'bold', label: 'Bold', desc: 'Strong, impactful, dynamic' },
  { value: 'organic', label: 'Organic', desc: 'Natural, flowing, textured' },
];

export function VisualPreferencesStep({ value = {}, stepId }: VisualPreferencesStepProps) {
  const { setAnswer } = useOnboardingStore();

  const updateField = (field: string, newValue: any) => {
    setAnswer(stepId, { ...value, [field]: newValue });
  };

  const addCustomColor = () => {
    const colors = value.customColors || [];
    if (colors.length < 6) {
      updateField('customColors', [...colors, '#6366f1']);
    }
  };

  const updateCustomColor = (index: number, color: string) => {
    const colors = [...(value.customColors || [])];
    colors[index] = color;
    updateField('customColors', colors);
  };

  const removeCustomColor = (index: number) => {
    const colors = [...(value.customColors || [])];
    colors.splice(index, 1);
    updateField('customColors', colors);
  };

  const handleAIApply = (fields: ParsedField[]) => {
    const patch: Record<string, any> = {};
    for (const f of fields) {
      if (f.key === 'customColors' && Array.isArray(f.value)) {
        const existing = value.customColors || [];
        patch.customColors = [...new Set([...existing, ...f.value])].slice(0, 6);
      } else if (f.key === 'colorMood') {
        // Try to extract just the keyword before the dash
        const moodKey = (typeof f.value === 'string' ? f.value.split('—')[0].trim() : '').toLowerCase();
        const match = COLOR_MOODS.find((m) => m.value === moodKey);
        if (match) patch.colorMood = match.value;
      } else if (f.key === 'visualStyle') {
        patch.visualStyle = typeof f.value === 'string' ? f.value : '';
      }
    }
    if (Object.keys(patch).length > 0) {
      setAnswer(stepId, { ...value, ...patch });
    }
  };

  return (
    <div className="space-y-4">
      <AIAssistBox
        placeholder="Example: I like cool blue tones with a minimalist style. Our brand colors are #0ea5e9 and #1e293b. Think Apple meets Notion."
        parse={parseVisualPreferences}
        onApply={handleAIApply}
      />

      {/* Color Mood */}
      <Card className="p-6">
        <h3 className="font-semibold mb-1">Color Mood</h3>
        <p className="text-sm text-muted-foreground mb-4">
          What color family feels right for your brand?
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {COLOR_MOODS.map((mood) => (
            <button
              key={mood.value}
              type="button"
              className={`p-3 text-left border rounded-lg transition-colors ${
                value.colorMood === mood.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted'
              }`}
              onClick={() => updateField('colorMood', mood.value)}
            >
              <div
                className="w-6 h-6 rounded-full mb-2 border"
                style={{ backgroundColor: mood.swatch }}
              />
              <div className="text-sm font-medium">{mood.label}</div>
              <div className="text-xs text-muted-foreground">{mood.desc}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* Custom Colors */}
      <Card className="p-6">
        <h3 className="font-semibold mb-1">Specific Colors</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Already have brand colors in mind? Add them here (up to 6).
        </p>
        <div className="space-y-3">
          {(value.customColors || []).map((color: string, index: number) => (
            <div key={index} className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => updateCustomColor(index, e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border border-border"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => updateCustomColor(index, e.target.value)}
                className="w-28 px-2 py-1 text-sm border border-border rounded bg-background font-mono"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeCustomColor(index)}
                className="p-2 h-8 w-8"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {(!value.customColors || value.customColors.length < 6) && (
            <Button variant="outline" onClick={addCustomColor} className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Color
            </Button>
          )}
        </div>
      </Card>

      {/* Visual Style */}
      <Card className="p-6">
        <h3 className="font-semibold mb-1">Style Direction</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Which visual direction resonates with your brand?
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {VISUAL_STYLES.map((style) => (
            <button
              key={style.value}
              type="button"
              className={`p-4 text-left border rounded-lg transition-colors ${
                value.visualStyle === style.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted'
              }`}
              onClick={() => updateField('visualStyle', style.value)}
            >
              <div className="font-medium text-sm">{style.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{style.desc}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* Style notes */}
      <Card className="p-6">
        <h3 className="font-semibold mb-1">Visual References</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Any brands, websites, or styles you admire?
        </p>
        <textarea
          placeholder="e.g., 'I love the clean look of Apple and the playfulness of Mailchimp...'"
          value={value.styleNotes || ''}
          onChange={(e) => updateField('styleNotes', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-border rounded-md bg-background resize-none"
        />
      </Card>
    </div>
  );
}
