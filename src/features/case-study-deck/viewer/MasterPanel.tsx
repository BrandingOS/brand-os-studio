/**
 * Master Panel — deck-wide token customization.
 *
 * The Master Slide concept: edit once, every slide updates. Exposes a
 * subset of `DeckStyle` tokens so the user can fine-tune the active
 * template (header / footer / numeral / font scale / padding / gap)
 * without touching individual slides.
 *
 * Per-slide style overrides BYPASS the master (a slide explicitly
 * pinned to a different template gets the raw preset). That keeps the
 * master from clobbering an intentional one-off.
 */

import type { CSSProperties, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { X, RotateCcw } from 'lucide-react';
import { MASTER_DEFAULTS, type MasterOverrides, STYLES, type DeckStyleId } from '../styles';

interface Props {
  open: boolean;
  onClose: () => void;
  master: MasterOverrides;
  deckStyleId: DeckStyleId;
  onChange: (patch: Partial<MasterOverrides>) => void;
  onReset: () => void;
}

const TOPBAR_OPTIONS: { value: NonNullable<MasterOverrides['topBar']>; label: string }[] = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'tabular', label: 'Tabular' },
  { value: 'numbered', label: 'Numbered' },
  { value: 'none', label: 'Hidden' },
];

const BOTTOMBAR_OPTIONS: { value: NonNullable<MasterOverrides['bottomBar']>; label: string }[] = [
  { value: 'page-num', label: 'Page #' },
  { value: 'tagline', label: 'Tagline' },
  { value: 'meta', label: 'Meta' },
  { value: 'none', label: 'Hidden' },
];

const NUMERAL_OPTIONS: { value: NonNullable<MasterOverrides['cornerNumeral']>; label: string }[] = [
  { value: 'oversized', label: 'Oversized' },
  { value: 'tabular', label: 'Tabular' },
  { value: 'thin', label: 'Thin' },
  { value: 'none', label: 'None' },
];

const RULE_OPTIONS: { value: NonNullable<MasterOverrides['pageRule']>; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'top', label: 'Top' },
  { value: 'top-bottom', label: 'Top + Bottom' },
];

export function MasterPanel({ open, onClose, master, deckStyleId, onChange, onReset }: Props) {
  if (!open) return null;
  const baseStyle = STYLES[deckStyleId];

  const labelStyle: CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    opacity: 0.55,
    marginBottom: 8,
  };

  const sectionStyle: CSSProperties = {
    paddingTop: 22,
    borderTop: '1px solid #1c1c1c',
    marginTop: 22,
  };

  const hasChanges = Object.keys(master).length > 0;

  return (
    <aside
      style={{
        position: 'fixed',
        top: 56,
        right: 0,
        bottom: 0,
        width: 380,
        background: '#0d0d0d',
        borderLeft: '1px solid #1c1c1c',
        zIndex: 50,
        overflowY: 'auto',
        boxShadow: '-30px 0 60px -10px rgba(0,0,0,0.6)',
      }}
    >
      <div style={{ position: 'sticky', top: 0, background: '#0d0d0d', borderBottom: '1px solid #1c1c1c', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Master Slide</div>
          <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>
            Edits apply to every slide on <strong>{baseStyle.name}</strong>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close master panel"
          style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 6, borderRadius: 6 }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div style={{ padding: '20px 20px 80px' }}>
        {/* Header */}
        <div style={labelStyle}>Header</div>
        <SegmentedControl
          options={TOPBAR_OPTIONS}
          value={master.topBar ?? baseStyle.chrome.topBar}
          onChange={(v) => onChange({ topBar: v })}
        />

        <div style={{ ...sectionStyle, ...labelStyle, marginTop: 22 }}>Footer</div>
        <SegmentedControl
          options={BOTTOMBAR_OPTIONS}
          value={master.bottomBar ?? baseStyle.chrome.bottomBar}
          onChange={(v) => onChange({ bottomBar: v })}
        />

        <div style={{ ...sectionStyle, ...labelStyle, marginTop: 22 }}>Page Numeral</div>
        <SegmentedControl
          options={NUMERAL_OPTIONS}
          value={master.cornerNumeral ?? baseStyle.chrome.cornerNumeral}
          onChange={(v) => onChange({ cornerNumeral: v })}
        />

        <div style={{ ...sectionStyle, ...labelStyle, marginTop: 22 }}>Rules</div>
        <SegmentedControl
          options={RULE_OPTIONS}
          value={master.pageRule ?? baseStyle.chrome.pageRule}
          onChange={(v) => onChange({ pageRule: v })}
        />

        {/* Typography */}
        <div style={{ ...sectionStyle, ...labelStyle, marginTop: 22 }}>Typography Scale</div>
        <Slider
          label="Heading"
          min={MASTER_DEFAULTS.headingScale.min}
          max={MASTER_DEFAULTS.headingScale.max}
          step={MASTER_DEFAULTS.headingScale.step}
          value={master.headingScale ?? baseStyle.typography.headingScale}
          onChange={(v) => onChange({ headingScale: v })}
          format={(v) => `${v.toFixed(2)}×`}
        />
        <Slider
          label="Body"
          min={MASTER_DEFAULTS.bodyScale.min}
          max={MASTER_DEFAULTS.bodyScale.max}
          step={MASTER_DEFAULTS.bodyScale.step}
          value={master.bodyScale ?? baseStyle.typography.bodyScale}
          onChange={(v) => onChange({ bodyScale: v })}
          format={(v) => `${v.toFixed(2)}×`}
        />

        {/* Spacing */}
        <div style={{ ...sectionStyle, ...labelStyle, marginTop: 22 }}>Spacing</div>
        <Slider
          label="Edge padding"
          min={MASTER_DEFAULTS.pad.min}
          max={MASTER_DEFAULTS.pad.max}
          step={MASTER_DEFAULTS.pad.step}
          value={master.pad ?? baseStyle.spacing.pad}
          onChange={(v) => onChange({ pad: v })}
          format={(v) => `${v}px`}
        />
        <Slider
          label="Block gap"
          min={MASTER_DEFAULTS.blockGap.min}
          max={MASTER_DEFAULTS.blockGap.max}
          step={MASTER_DEFAULTS.blockGap.step}
          value={master.blockGap ?? baseStyle.spacing.blockGap}
          onChange={(v) => onChange({ blockGap: v })}
          format={(v) => `${v}px`}
        />
        <Slider
          label="Column gap"
          min={MASTER_DEFAULTS.columnGap.min}
          max={MASTER_DEFAULTS.columnGap.max}
          step={MASTER_DEFAULTS.columnGap.step}
          value={master.columnGap ?? baseStyle.spacing.columnGap}
          onChange={(v) => onChange({ columnGap: v })}
          format={(v) => `${v}px`}
        />

        <div style={{ marginTop: 32, paddingTop: 22, borderTop: '1px solid #1c1c1c' }}>
          <Button
            size="sm"
            variant="ghost"
            onClick={onReset}
            disabled={!hasChanges}
            className="w-full text-white hover:bg-white/10 gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset master to {baseStyle.name} defaults
          </Button>
          <div style={{ fontSize: 10, opacity: 0.5, marginTop: 8, textAlign: 'center' }}>
            {hasChanges
              ? `${Object.keys(master).length} override${Object.keys(master).length === 1 ? '' : 's'} active`
              : `No overrides — using ${baseStyle.name} as-is`}
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ─────────────────────────  controls  ─────────────────────── */

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${options.length}, 1fr)`, gap: 4, padding: 4, background: '#161616', borderRadius: 8, border: '1px solid #2a2a2a' }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            style={{
              padding: '8px 6px',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.04em',
              borderRadius: 6,
              border: 'none',
              background: active ? '#fff' : 'transparent',
              color: active ? '#000' : '#fff',
              cursor: 'pointer',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
  format,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: '#fff', opacity: 0.75 }}>{label}</span>
        <span style={{ fontSize: 11, color: '#fff', opacity: 0.55, fontFamily: 'ui-monospace, monospace' }}>{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: '#fff' }}
      />
    </div>
  );
}
