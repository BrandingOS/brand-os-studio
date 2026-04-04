import { cn } from '@/lib/utils';
import { Label } from '@/shared/design-system';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { COLOR_PRESETS } from '../data/layouts';
import type { LogoConfig } from '../types';
import { Palette, Droplets, BoxSelect, Sun } from 'lucide-react';

interface StylePanelProps {
  config: LogoConfig;
  onChange: (updates: Partial<LogoConfig>) => void;
}

export function StylePanel({ config, onChange }: StylePanelProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Color Presets */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Palette className="w-3.5 h-3.5" />
          Color Presets
        </Label>
        <div className="grid grid-cols-6 gap-1.5">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() =>
                onChange({ primaryColor: preset.primary, secondaryColor: preset.secondary })
              }
              title={preset.name}
              className={cn(
                'aspect-square rounded-lg overflow-hidden ring-offset-2 transition-all hover:scale-110',
                config.primaryColor === preset.primary && 'ring-2 ring-primary',
              )}
              style={{
                background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Custom Colors */}
      <div className="space-y-3">
        <Label>Custom Colors</Label>

        {/* Primary */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="color"
              value={config.primaryColor}
              onChange={(e) => onChange({ primaryColor: e.target.value })}
              className="w-8 h-8 rounded-md border border-border cursor-pointer appearance-none bg-transparent [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded"
            />
          </div>
          <div className="flex-1 space-y-0.5">
            <p className="text-xs font-medium">Primary</p>
            <Input
              value={config.primaryColor}
              onChange={(e) => onChange({ primaryColor: e.target.value })}
              className="h-7 text-xs font-mono"
            />
          </div>
        </div>

        {/* Secondary */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="color"
              value={config.secondaryColor}
              onChange={(e) => onChange({ secondaryColor: e.target.value })}
              className="w-8 h-8 rounded-md border border-border cursor-pointer appearance-none bg-transparent [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded"
            />
          </div>
          <div className="flex-1 space-y-0.5">
            <p className="text-xs font-medium">Secondary</p>
            <Input
              value={config.secondaryColor}
              onChange={(e) => onChange({ secondaryColor: e.target.value })}
              className="h-7 text-xs font-mono"
            />
          </div>
        </div>

        {/* Background */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="color"
              value={config.backgroundColor}
              onChange={(e) => onChange({ backgroundColor: e.target.value })}
              className="w-8 h-8 rounded-md border border-border cursor-pointer appearance-none bg-transparent [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded"
            />
          </div>
          <div className="flex-1 space-y-0.5">
            <p className="text-xs font-medium">Background</p>
            <Input
              value={config.backgroundColor}
              onChange={(e) => onChange({ backgroundColor: e.target.value })}
              className="h-7 text-xs font-mono"
            />
          </div>
        </div>
      </div>

      {/* Gradient */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Droplets className="w-3.5 h-3.5" />
            Gradient
          </Label>
          <Switch
            checked={config.showGradient}
            onCheckedChange={(v) => onChange({ showGradient: v })}
          />
        </div>
        {config.showGradient && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Angle</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {config.gradientAngle}deg
              </span>
            </div>
            <Slider
              value={[config.gradientAngle]}
              onValueChange={([v]) => onChange({ gradientAngle: v })}
              min={0}
              max={360}
              step={15}
            />
          </div>
        )}
      </div>

      {/* Shadow */}
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Sun className="w-3.5 h-3.5" />
          Shadow
        </Label>
        <Switch
          checked={config.shadow}
          onCheckedChange={(v) => onChange({ shadow: v })}
        />
      </div>

      {/* Border Radius */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <BoxSelect className="w-3.5 h-3.5" />
            Border Radius
          </Label>
          <span className="text-xs text-muted-foreground tabular-nums">
            {config.borderRadius}px
          </span>
        </div>
        <Slider
          value={[config.borderRadius]}
          onValueChange={([v]) => onChange({ borderRadius: v })}
          min={0}
          max={100}
          step={2}
        />
      </div>
    </div>
  );
}
