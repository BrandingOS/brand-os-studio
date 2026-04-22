/**
 * GradientsShowcase — a grid of gradient panels.
 *
 * Each panel composes a different pair of stops so the user can find
 * a gradient that flatters their brand. When a secondary scale is
 * present we also cross-pair primary × secondary for richer mixes.
 */
import { Copy } from 'lucide-react';
import { useState } from 'react';

import { pickOn, type ShowcaseProps } from './showcase-shared';

export function GradientsShowcase({ palette, secondary }: ShowcaseProps) {
  const p = palette.roles.primary.shades;
  const n = palette.roles.neutral.shades;
  const s = secondary?.shades ?? p;

  const tiles: { a: string; b: string; label: string; direction: string }[] = [
    { a: p[300].hex, b: p[600].hex, label: 'Primary soft → mid', direction: '135deg' },
    { a: p[500].hex, b: p[900].hex, label: 'Primary vivid → deep', direction: '135deg' },
    { a: p[200].hex, b: s[500].hex, label: 'Light → Secondary', direction: '135deg' },
    { a: p[600].hex, b: s[600].hex, label: 'Primary × Secondary', direction: '135deg' },
    { a: p[700].hex, b: n[950].hex, label: 'Primary → Night', direction: '180deg' },
    { a: s[400].hex, b: p[700].hex, label: 'Radial sunset', direction: 'radial' },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {tiles.map((t) => (
        <GradientTile key={t.label} {...t} neutral={n[50].hex} neutralDark={n[950].hex} />
      ))}
    </div>
  );
}

function GradientTile({
  a,
  b,
  label,
  direction,
  neutral,
  neutralDark,
}: {
  a: string;
  b: string;
  label: string;
  direction: string;
  neutral: string;
  neutralDark: string;
}) {
  const [copied, setCopied] = useState(false);
  const css =
    direction === 'radial'
      ? `radial-gradient(circle at 20% 20%, ${a}, ${b})`
      : `linear-gradient(${direction}, ${a}, ${b})`;
  const fg = pickOn(b, neutral, neutralDark);

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(`background: ${css};`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* blocked */
    }
  };

  return (
    <div
      className="relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-2xl p-4"
      style={{ background: css, color: fg }}
    >
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-[11px] opacity-80">Gradient</p>
          <p className="text-sm font-semibold">{label}</p>
        </div>
        <button
          type="button"
          onClick={doCopy}
          className="inline-flex h-7 items-center gap-1 rounded-full px-2 text-[11px] font-semibold"
          style={{ background: `${fg}22`, color: fg }}
          aria-label="Copy CSS"
        >
          <Copy className="h-3 w-3" />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
