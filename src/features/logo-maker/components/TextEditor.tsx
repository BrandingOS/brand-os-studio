import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/shared/design-system';
import { Slider } from '@/components/ui/slider';
import { FONT_OPTIONS } from '../data/layouts';
import type { LogoConfig } from '../types';
import { Type, ALargeSmall, Space, CaseSensitive } from 'lucide-react';

interface TextEditorProps {
  config: LogoConfig;
  onChange: (updates: Partial<LogoConfig>) => void;
}

export function TextEditor({ config, onChange }: TextEditorProps) {
  const textTransformOptions: { value: LogoConfig['textTransform']; label: string }[] = [
    { value: 'none', label: 'Aa' },
    { value: 'uppercase', label: 'AA' },
    { value: 'lowercase', label: 'aa' },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Brand Name */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Type className="w-3.5 h-3.5" />
          Brand Name
        </Label>
        <Input
          value={config.brandName}
          onChange={(e) => onChange({ brandName: e.target.value })}
          placeholder="Enter brand name"
          className="h-9 text-sm"
        />
      </div>

      {/* Tagline */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <ALargeSmall className="w-3.5 h-3.5" />
          Tagline
        </Label>
        <Input
          value={config.tagline}
          onChange={(e) => onChange({ tagline: e.target.value })}
          placeholder="Optional tagline"
          className="h-9 text-sm"
        />
      </div>

      {/* Font Family */}
      <div className="space-y-2">
        <Label>Font Family</Label>
        <div className="grid grid-cols-2 gap-1.5 max-h-[240px] overflow-y-auto pr-1">
          {FONT_OPTIONS.map((font) => (
            <button
              key={font}
              onClick={() => onChange({ fontFamily: font })}
              className={cn(
                'px-3 py-2 rounded-lg text-xs text-left truncate transition-all',
                'hover:bg-accent hover:text-accent-foreground',
                config.fontFamily === font
                  ? 'bg-primary/10 text-primary ring-1 ring-primary/30 font-medium'
                  : 'bg-muted/50 text-muted-foreground',
              )}
              style={{ fontFamily: font }}
            >
              {font}
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <ALargeSmall className="w-3.5 h-3.5" />
            Font Size
          </Label>
          <span className="text-xs text-muted-foreground tabular-nums">{config.fontSize}px</span>
        </div>
        <Slider
          value={[config.fontSize]}
          onValueChange={([v]) => onChange({ fontSize: v })}
          min={12}
          max={72}
          step={1}
          className="w-full"
        />
      </div>

      {/* Letter Spacing */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Space className="w-3.5 h-3.5" />
            Letter Spacing
          </Label>
          <span className="text-xs text-muted-foreground tabular-nums">{config.letterSpacing}px</span>
        </div>
        <Slider
          value={[config.letterSpacing]}
          onValueChange={([v]) => onChange({ letterSpacing: v })}
          min={-5}
          max={20}
          step={0.5}
          className="w-full"
        />
      </div>

      {/* Text Transform */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <CaseSensitive className="w-3.5 h-3.5" />
          Text Transform
        </Label>
        <div className="flex gap-1">
          {textTransformOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange({ textTransform: opt.value })}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                config.textTransform === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Icon Size */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Icon Size</Label>
          <span className="text-xs text-muted-foreground tabular-nums">{config.iconSize}px</span>
        </div>
        <Slider
          value={[config.iconSize]}
          onValueChange={([v]) => onChange({ iconSize: v })}
          min={16}
          max={120}
          step={2}
          className="w-full"
        />
      </div>
    </div>
  );
}
