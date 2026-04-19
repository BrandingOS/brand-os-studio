/**
 * TypographyPanel — Relume-style font controls.
 *
 * Weight dropdown (Regular/Medium/Bold) + Shuffle with keyboard hint.
 * Heading + Body as large cards showing the font name in the actual
 * font family, with a "Google · Free" provenance badge.
 */
import { useEffect, useRef, useState } from 'react';
import { Shuffle, ChevronDown, Search, Check } from 'lucide-react';
import { useBrandBoardStore } from '../store/useBrandBoardStore';
import { FONT_PAIRINGS } from '../engine/fontPairings';
import { loadFontFamily } from '@/shared/design-system/fonts';

type Weight = 'light' | 'regular' | 'bold';

const WEIGHT_OPTIONS: { value: Weight; label: string }[] = [
  { value: 'light', label: 'Light · book' },
  { value: 'regular', label: 'Regular · medium' },
  { value: 'bold', label: 'Bold · black' },
];

const POPULAR_FONTS = Array.from(
  new Set(FONT_PAIRINGS.flatMap((p) => [p.heading, p.body])),
).sort();

// ---- sub-components --------------------------------------------------------

interface FontCardProps {
  label: 'Heading' | 'Body';
  fontFamily: string;
  onSelect: (font: string) => void;
}

function FontCard({ label, fontFamily, onSelect }: FontCardProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open]);

  // Preload fonts that appear in the popular list so previews render properly
  useEffect(() => {
    if (!open) return;
    POPULAR_FONTS.slice(0, 20).forEach((f) => loadFontFamily(f));
  }, [open]);

  const filtered = search
    ? POPULAR_FONTS.filter((f) => f.toLowerCase().includes(search.toLowerCase()))
    : POPULAR_FONTS;

  return (
    <div ref={cardRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full rounded-[20px] bg-white p-5 text-left transition-shadow"
        style={{
          boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px -12px rgba(0,0,0,0.10)',
        }}
      >
        <div className="text-[11px] font-semibold text-muted-foreground/80 mb-3 tracking-wide">
          {label}
        </div>
        <div
          className="text-[28px] font-semibold truncate mb-4 tracking-tight"
          style={{ fontFamily: `'${fontFamily}', sans-serif` }}
        >
          {fontFamily}
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-gradient-to-br from-red-500 via-yellow-400 to-green-500 shrink-0" />
          <span className="text-xs font-medium text-muted-foreground">Google</span>
          <span className="text-xs text-muted-foreground/50">·</span>
          <span className="text-xs font-medium text-muted-foreground">Free</span>
        </div>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-border bg-popover shadow-lg z-20 p-2">
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search fonts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm pl-8 pr-2 py-1.5 rounded-lg border border-border/60 bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.map((f) => {
              const active = f === fontFamily;
              return (
                <button
                  key={f}
                  type="button"
                  className={`w-full flex items-center justify-between text-left text-sm px-2.5 py-2 rounded-md transition-colors ${
                    active ? 'bg-primary/10 text-primary' : 'hover:bg-muted/60'
                  }`}
                  style={{ fontFamily: `'${f}', sans-serif` }}
                  onClick={() => {
                    onSelect(f);
                    loadFontFamily(f);
                    setOpen(false);
                    setSearch('');
                  }}
                  onMouseEnter={() => loadFontFamily(f)}
                >
                  <span>{f}</span>
                  {active && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No fonts found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function WeightSelect({ value, onChange }: { value: Weight; onChange: (w: Weight) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = WEIGHT_OPTIONS.find((w) => w.value === value) ?? WEIGHT_OPTIONS[1];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[13px] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-6px_rgba(0,0,0,0.08)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.05),0_6px_16px_-6px_rgba(0,0,0,0.12)] transition-shadow"
      >
        <span className="text-muted-foreground">{current.label}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 min-w-[160px] rounded-lg border border-border bg-popover shadow-lg z-20 p-1">
          {WEIGHT_OPTIONS.map((o) => {
            const active = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between text-left text-sm px-2.5 py-1.5 rounded-md transition-colors ${
                  active ? 'bg-primary/10 text-primary' : 'hover:bg-muted/60'
                }`}
              >
                <span className="capitalize">{o.label}</span>
                {active && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ShuffleButton({ onClick, hint }: { onClick: () => void; hint: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-6px_rgba(0,0,0,0.08)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.05),0_6px_16px_-6px_rgba(0,0,0,0.12)] transition-shadow"
    >
      <Shuffle className="h-3.5 w-3.5" />
      <span>Shuffle</span>
      <kbd className="ml-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-neutral-100 rounded text-muted-foreground">
        {hint}
      </kbd>
    </button>
  );
}

// ---- main ------------------------------------------------------------------

export function TypographyPanel() {
  const draft = useBrandBoardStore((s) => s.draft);
  const setFont = useBrandBoardStore((s) => s.setFont);
  const storeSetWeight = useBrandBoardStore((s) => s.setWeight);
  const shuffleTypography = useBrandBoardStore((s) => s.shuffleTypography);

  useEffect(() => {
    loadFontFamily(draft.typography.heading);
    loadFontFamily(draft.typography.body);
  }, [draft.typography.heading, draft.typography.body]);

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[22px] font-semibold tracking-tight text-foreground">Typography</h3>
        <div className="flex items-center gap-2">
          <WeightSelect value={draft.typography.weight} onChange={storeSetWeight} />
          <ShuffleButton onClick={shuffleTypography} hint="T" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FontCard
          label="Heading"
          fontFamily={draft.typography.heading}
          onSelect={(f) => setFont('heading', f)}
        />
        <FontCard
          label="Body"
          fontFamily={draft.typography.body}
          onSelect={(f) => setFont('body', f)}
        />
      </div>
    </section>
  );
}
