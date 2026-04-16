import { useEffect, useState } from 'react';
import { Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBrandBoardStore } from '../store/useBrandBoardStore';
import { FONT_PAIRINGS } from '../engine/fontPairings';
import { shuffleFontPairing } from '../engine/shuffle';
import { loadFontFamily } from '@/shared/design-system/fonts';

type Weight = 'light' | 'regular' | 'bold';

const POPULAR_FONTS = Array.from(
  new Set(FONT_PAIRINGS.flatMap((p) => [p.heading, p.body])),
).sort();

interface FontCardProps {
  label: string;
  fontFamily: string;
  onSelect: (font: string) => void;
}

function FontCard({ label, fontFamily, onSelect }: FontCardProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = search
    ? POPULAR_FONTS.filter((f) => f.toLowerCase().includes(search.toLowerCase()))
    : POPULAR_FONTS;

  return (
    <div className="rounded-xl border border-border/60 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
          Google - Free
        </span>
      </div>

      <button
        type="button"
        className="w-full text-left hover:bg-muted/40 rounded-lg p-2 -mx-1 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <p
          className="text-lg font-semibold truncate"
          style={{ fontFamily: `'${fontFamily}', sans-serif` }}
        >
          {fontFamily}
        </p>
        <p
          className="text-sm text-muted-foreground mt-0.5"
          style={{ fontFamily: `'${fontFamily}', sans-serif` }}
        >
          Aa Bb Cc 123
        </p>
      </button>

      {open && (
        <div className="border-t border-border/40 pt-2 space-y-1.5">
          <input
            type="text"
            placeholder="Search fonts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-border/60 bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
            autoFocus
          />
          <div className="max-h-40 overflow-y-auto space-y-0.5">
            {filtered.map((f) => (
              <button
                key={f}
                type="button"
                className={`w-full text-left text-sm px-2.5 py-1.5 rounded-md transition-colors ${
                  f === fontFamily
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'hover:bg-muted/60'
                }`}
                style={{ fontFamily: `'${f}', sans-serif` }}
                onClick={() => {
                  onSelect(f);
                  setOpen(false);
                  setSearch('');
                }}
              >
                {f}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                No fonts found
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function TypographyPanel() {
  const draft = useBrandBoardStore((s) => s.draft);
  const setTypography = useBrandBoardStore((s) => s.setTypography);
  const [weight, setWeight] = useState<Weight>('regular');

  // Load fonts when they change
  useEffect(() => {
    loadFontFamily(draft.typography.heading);
    loadFontFamily(draft.typography.body);
  }, [draft.typography.heading, draft.typography.body]);

  const handleShuffle = () => {
    const pairing = shuffleFontPairing();
    setTypography({ heading: pairing.heading, body: pairing.body });
  };

  const handleSetWeight = (w: Weight) => {
    setWeight(w);
    // Weight is a display-only concept for the preview; stored implicitly
    // through CSS font-weight in the preview components.
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Typography</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={handleShuffle}
          title="Shuffle typography"
        >
          <Shuffle className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Weight toggle */}
      <div className="flex rounded-lg border border-border/60 overflow-hidden mb-3">
        {(['light', 'regular', 'bold'] as Weight[]).map((w) => (
          <button
            key={w}
            type="button"
            className={`flex-1 text-xs py-1.5 capitalize transition-colors ${
              weight === w
                ? 'bg-primary text-primary-foreground font-medium'
                : 'bg-background hover:bg-muted/60 text-muted-foreground'
            }`}
            onClick={() => handleSetWeight(w)}
          >
            {w}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        <FontCard
          label="Heading"
          fontFamily={draft.typography.heading}
          onSelect={(f) => setTypography({ heading: f })}
        />
        <FontCard
          label="Body"
          fontFamily={draft.typography.body}
          onSelect={(f) => setTypography({ body: f })}
        />
      </div>
    </section>
  );
}
