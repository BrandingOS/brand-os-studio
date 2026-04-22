/**
 * LogosShowcase — the palette on six pretend brand marks.
 *
 * We're not designing logos here; we're showing how the scale reads on
 * deeply-saturated backgrounds, on paper-white surfaces, and at small
 * sizes (favicon-scale). Flipping the seed should make the bar look
 * distinct without laying out differently.
 */
import { pickOn, type ShowcaseProps } from './showcase-shared';

export function LogosShowcase({ palette, secondary }: ShowcaseProps) {
  const p = palette.roles.primary.shades;
  const n = palette.roles.neutral.shades;
  const s = secondary?.shades ?? p;

  const cards: { bg: string; fg: string; name: string; mark: React.ReactNode }[] = [
    {
      bg: p[600].hex,
      fg: pickOn(p[600].hex, n[50].hex, n[950].hex),
      name: 'Horizon',
      mark: <MarkCircle fill={pickOn(p[600].hex, n[50].hex, n[950].hex)} />,
    },
    {
      bg: n[50].hex,
      fg: n[900].hex,
      name: 'Atlas',
      mark: <MarkTriangle fill={p[600].hex} />,
    },
    {
      bg: p[900].hex,
      fg: pickOn(p[900].hex, n[50].hex, n[950].hex),
      name: 'Meridian',
      mark: <MarkSpark fill={pickOn(p[900].hex, n[50].hex, n[950].hex)} />,
    },
    {
      bg: s[500].hex,
      fg: pickOn(s[500].hex, n[50].hex, n[950].hex),
      name: 'Cove',
      mark: <MarkWave fill={pickOn(s[500].hex, n[50].hex, n[950].hex)} />,
    },
    {
      bg: n[900].hex,
      fg: n[50].hex,
      name: 'Northlight',
      mark: <MarkStar fill={p[400].hex} />,
    },
    {
      bg: p[100].hex,
      fg: p[900].hex,
      name: 'Stratus',
      mark: <MarkCircle fill={p[700].hex} />,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((c) => (
        <div
          key={c.name}
          className="flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-2xl border p-6"
          style={{ background: c.bg, borderColor: `${c.fg}22`, color: c.fg }}
        >
          {c.mark}
          <p className="text-xl font-bold tracking-tight">{c.name}</p>
          <p className="text-[11px] uppercase tracking-[0.2em] opacity-70">
            a brand system
          </p>
        </div>
      ))}
    </div>
  );
}

function MarkCircle({ fill }: { fill: string }) {
  return (
    <svg viewBox="0 0 40 40" className="h-10 w-10">
      <circle cx="20" cy="20" r="18" fill={fill} />
      <circle cx="26" cy="18" r="7" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

function MarkTriangle({ fill }: { fill: string }) {
  return (
    <svg viewBox="0 0 40 40" className="h-10 w-10">
      <polygon points="20,3 37,35 3,35" fill={fill} />
      <circle cx="20" cy="24" r="5" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

function MarkSpark({ fill }: { fill: string }) {
  return (
    <svg viewBox="0 0 40 40" className="h-10 w-10">
      <path
        d="M20 3 L24 16 L37 20 L24 24 L20 37 L16 24 L3 20 L16 16 Z"
        fill={fill}
      />
    </svg>
  );
}

function MarkWave({ fill }: { fill: string }) {
  return (
    <svg viewBox="0 0 40 40" className="h-10 w-10">
      <path
        d="M4 24 C 10 14, 14 34, 20 24 S 30 14, 36 24 L 36 36 L 4 36 Z"
        fill={fill}
      />
    </svg>
  );
}

function MarkStar({ fill }: { fill: string }) {
  return (
    <svg viewBox="0 0 40 40" className="h-10 w-10">
      <polygon
        points="20,4 24,15 36,16 27,24 30,36 20,30 10,36 13,24 4,16 16,15"
        fill={fill}
      />
    </svg>
  );
}
