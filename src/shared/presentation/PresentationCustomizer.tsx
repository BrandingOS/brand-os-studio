/**
 * PresentationCustomizer — Shared sidebar panel for customizing any
 * slide-based presentation (guidelines, logo presentation, etc.).
 *
 * Purely props-driven: each presentation type passes its settings +
 * callbacks so this component is store-agnostic.
 */
import {
  Layout, FileText, Type, Settings, Eye, RotateCcw, Check,
} from 'lucide-react';
import type { PresentationSettings, PresentationTemplate, SizeFormat } from './types';
import { SIZE_PRESETS } from './types';

// ── Props ───────────────────────────────────────────────

interface PresentationCustomizerProps {
  /** Current settings */
  settings: PresentationSettings;

  /** Available templates for this presentation type */
  templates: PresentationTemplate[];

  /** Callbacks */
  onSetTemplate: (id: string) => void;
  onSetSizeFormat: (format: SizeFormat) => void;
  onSetCustomSize?: (width: number, height: number) => void;
  onSetLanguageDirection: (dir: 'ltr' | 'rtl') => void;
  onUpdateSpacing: (spacing: Partial<PresentationSettings['spacing']>) => void;
  onUpdateHeader: (header: Partial<PresentationSettings['header']>) => void;
  onUpdateFooter: (footer: Partial<PresentationSettings['footer']>) => void;
  onReset: () => void;

  /** Presentation type label (e.g. "Logo Presentation", "Brand Guidelines") */
  title?: string;

  /** Optional: dark or light variant (default: dark) */
  variant?: 'dark' | 'light';
}

// ── Helpers ─────────────────────────────────────────────

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-3.5 h-3.5 text-white/40" />
      <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">{label}</span>
    </div>
  );
}

function Toggle({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-white/70">{label}</p>
        {description && <p className="text-[10px] text-white/25 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
          checked ? 'bg-white/20' : 'bg-white/[0.06]'
        }`}
      >
        <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
          checked ? 'left-[18px] bg-white' : 'left-0.5 bg-white/30'
        }`} />
      </button>
    </div>
  );
}

function SliderControl({ value, onChange, min, max, step, label, description, suffix = 'px' }: {
  value: number; onChange: (v: number) => void; min: number; max: number; step: number;
  label: string; description?: string; suffix?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-white/70">{label}</p>
          {description && <p className="text-[10px] text-white/25 mt-0.5">{description}</p>}
        </div>
        <span className="text-[10px] font-mono text-white/30 bg-white/[0.04] px-1.5 py-0.5 rounded">
          {value}{suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 appearance-none bg-white/[0.08] rounded-full outline-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/60 [&::-webkit-slider-thumb]:border-0
          [&::-webkit-slider-thumb]:hover:bg-white/80 [&::-webkit-slider-thumb]:transition-colors"
      />
    </div>
  );
}

// ── Main Component ──────────────────────────────────────

export function PresentationCustomizer({
  settings,
  templates,
  onSetTemplate,
  onSetSizeFormat,
  onSetCustomSize,
  onSetLanguageDirection,
  onUpdateSpacing,
  onUpdateHeader,
  onUpdateFooter,
  onReset,
  title = 'Customize',
}: PresentationCustomizerProps) {
  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="p-4 space-y-5">
        {/* Header */}
        <div className="pb-3 border-b border-white/[0.06]">
          <h3 className="text-sm font-semibold text-white/80">{title}</h3>
          <p className="text-[10px] text-white/25 mt-1">
            Customize the appearance and layout of your presentation
          </p>
        </div>

        {/* ── Template ── */}
        <div>
          <SectionHeader icon={Layout} label="Template" />
          <div className="space-y-1.5">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => onSetTemplate(t.id)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${
                  settings.template === t.id
                    ? 'border-white/15 bg-white/[0.06]'
                    : 'border-white/[0.04] bg-white/[0.02] hover:border-white/[0.08] hover:bg-white/[0.03]'
                }`}
              >
                {/* Thumbnail */}
                {t.preview ? (
                  <div className="w-10 h-7 rounded bg-white/[0.06] overflow-hidden flex-shrink-0">
                    <img src={t.preview} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-10 h-7 rounded bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                    <Layout className="w-3 h-3 text-white/20" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white/70 truncate">{t.name}</p>
                  <p className="text-[10px] text-white/25 truncate">{t.description}</p>
                </div>
                {settings.template === t.id && (
                  <div className="w-4 h-4 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                    <Check className="w-2.5 h-2.5 text-white/70" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Size & Format ── */}
        <div>
          <SectionHeader icon={FileText} label="Size & Format" />
          <div className="grid grid-cols-3 gap-1.5">
            {(Object.keys(SIZE_PRESETS) as SizeFormat[]).map((format) => {
              const dims = SIZE_PRESETS[format];
              const active = settings.size.format === format;
              return (
                <button
                  key={format}
                  onClick={() => onSetSizeFormat(format)}
                  className={`px-2 py-2 rounded-lg border text-center transition-all ${
                    active
                      ? 'border-white/15 bg-white/[0.06] text-white/80'
                      : 'border-white/[0.04] bg-white/[0.02] text-white/35 hover:border-white/[0.08] hover:text-white/50'
                  }`}
                >
                  <p className="text-[11px] font-medium">{format}</p>
                  <p className="text-[8px] text-white/20 mt-0.5">{dims.width}×{dims.height}</p>
                </button>
              );
            })}
          </div>

          {/* Custom size inputs */}
          {settings.size.format === 'Custom' && onSetCustomSize && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="text-[9px] text-white/20 uppercase tracking-wider">Width</label>
                <input
                  type="number"
                  value={settings.size.width}
                  onChange={(e) => onSetCustomSize(parseInt(e.target.value) || 1920, settings.size.height)}
                  className="w-full mt-1 px-2 py-1.5 bg-white/[0.04] border border-white/[0.06] rounded-lg text-xs text-white/60 font-mono focus:outline-none focus:border-white/15"
                />
              </div>
              <div>
                <label className="text-[9px] text-white/20 uppercase tracking-wider">Height</label>
                <input
                  type="number"
                  value={settings.size.height}
                  onChange={(e) => onSetCustomSize(settings.size.width, parseInt(e.target.value) || 1080)}
                  className="w-full mt-1 px-2 py-1.5 bg-white/[0.04] border border-white/[0.06] rounded-lg text-xs text-white/60 font-mono focus:outline-none focus:border-white/15"
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Language ── */}
        <div>
          <SectionHeader icon={Type} label="Language" />
          <Toggle
            checked={settings.language.direction === 'rtl'}
            onChange={(rtl) => onSetLanguageDirection(rtl ? 'rtl' : 'ltr')}
            label="Right-to-Left (RTL)"
            description="Flip layout direction for Arabic, Hebrew, etc."
          />
        </div>

        {/* ── Spacing ── */}
        <div>
          <SectionHeader icon={Settings} label="Spacing & Layout" />
          <div className="space-y-4">
            <SliderControl
              value={settings.spacing.padding}
              onChange={(v) => onUpdateSpacing({ padding: v })}
              min={20} max={120} step={10}
              label="Page Padding" description="Space around content"
            />
            <SliderControl
              value={settings.spacing.margins}
              onChange={(v) => onUpdateSpacing({ margins: v })}
              min={10} max={80} step={5}
              label="Content Margins" description="Space between sections"
            />
            <SliderControl
              value={settings.spacing.cornerRadius}
              onChange={(v) => onUpdateSpacing({ cornerRadius: v })}
              min={0} max={24} step={2}
              label="Corner Radius" description="Roundness of elements"
            />
          </div>
        </div>

        {/* ── Header & Footer ── */}
        <div>
          <SectionHeader icon={Eye} label="Header & Footer" />
          <div className="space-y-4">
            {/* Header */}
            <div className="space-y-2.5">
              <Toggle
                checked={settings.header.enabled}
                onChange={(v) => onUpdateHeader({ enabled: v })}
                label="Show Header"
              />
              {settings.header.enabled && (
                <div className="pl-3 border-l border-white/[0.06] space-y-2.5">
                  <Toggle
                    checked={settings.header.showDate}
                    onChange={(v) => onUpdateHeader({ showDate: v })}
                    label="Date"
                  />
                  <Toggle
                    checked={settings.header.showProjectName}
                    onChange={(v) => onUpdateHeader({ showProjectName: v })}
                    label="Project Name"
                  />
                  <div>
                    <p className="text-[10px] text-white/30 mb-1">Custom Text</p>
                    <input
                      type="text"
                      value={settings.header.customText || ''}
                      onChange={(e) => onUpdateHeader({ customText: e.target.value })}
                      placeholder="Header text..."
                      className="w-full px-2 py-1.5 bg-white/[0.04] border border-white/[0.06] rounded-lg text-xs text-white/60 placeholder:text-white/15 focus:outline-none focus:border-white/15"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="space-y-2.5">
              <Toggle
                checked={settings.footer.enabled}
                onChange={(v) => onUpdateFooter({ enabled: v })}
                label="Show Footer"
              />
              {settings.footer.enabled && (
                <div className="pl-3 border-l border-white/[0.06] space-y-2.5">
                  <Toggle
                    checked={settings.footer.showPageNumbers}
                    onChange={(v) => onUpdateFooter({ showPageNumbers: v })}
                    label="Page Numbers"
                  />
                  <div>
                    <p className="text-[10px] text-white/30 mb-1">Custom Text</p>
                    <input
                      type="text"
                      value={settings.footer.customText || ''}
                      onChange={(e) => onUpdateFooter({ customText: e.target.value })}
                      placeholder="Footer text..."
                      className="w-full px-2 py-1.5 bg-white/[0.04] border border-white/[0.06] rounded-lg text-xs text-white/60 placeholder:text-white/15 focus:outline-none focus:border-white/15"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Reset ── */}
        <div className="pt-3 border-t border-white/[0.06]">
          <button
            onClick={onReset}
            className="w-full flex items-center justify-center gap-2 h-9 rounded-lg text-xs font-medium text-white/35 hover:text-white/60 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-all"
          >
            <RotateCcw className="w-3 h-3" />
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
}
