/**
 * Gradients, composed from the brand's own ramp.
 *
 * A gradient is not a colour a brand decided, which is why these live INSIDE
 * the colour section rather than beside the swatches: they are derived, and the
 * page has to keep the difference between what a brand owns and what can be
 * built out of it. Every stop below is a step of `generateShades` on the
 * brand's lead colour, so nothing here introduces a hue the brand does not
 * have.
 *
 * Each panel hands over its CSS, because that is the only form in which a
 * gradient is actually useful to the person reading.
 */
import { useState } from 'react';
import type { IdentityRegister } from '../identityRegister';
import { pickFgOnBackground } from '@/shared/brand/logoOnBackground';
import { useReveal } from '../motion/useReveal';

export function GradientField({ register }: { register: IdentityRegister }) {
  const p = register.scale.shades;
  const n = register.neutral.shades;
  const s = register.secondScale?.shades ?? p;
  const hasSecond = Boolean(register.secondScale);

  const tiles = [
    { a: p[300].hex, b: p[600].hex, label: 'Soft to mid', dir: '135deg' },
    { a: p[500].hex, b: p[900].hex, label: 'Vivid to deep', dir: '135deg' },
    { a: p[700].hex, b: n[950].hex, label: 'Brand to night', dir: '180deg' },
    // The cross-pairs only exist for a brand that owns two colours. Pairing the
    // primary with a shade of itself and calling it "Primary × Secondary" would
    // be a label the palette cannot back up.
    ...(hasSecond
      ? [
          { a: p[600].hex, b: s[600].hex, label: 'Primary to secondary', dir: '135deg' },
          { a: p[200].hex, b: s[500].hex, label: 'Light to secondary', dir: '135deg' },
        ]
      : [
          { a: p[400].hex, b: p[700].hex, label: 'Radial', dir: 'radial' },
          { a: p[100].hex, b: p[500].hex, label: 'Wash', dir: '160deg' },
        ]),
    { a: s[400].hex, b: p[800].hex, label: 'Radial depth', dir: 'radial' },
  ];

  return (
    <div className="bi-grads">
      {tiles.map((t, i) => (
        <GradientTile key={t.label} {...t} onDark={n[50].hex} onLight={n[950].hex} delay={i * 60} />
      ))}
    </div>
  );
}

function GradientTile({
  a,
  b,
  label,
  dir,
  onDark,
  onLight,
  delay,
}: {
  a: string;
  b: string;
  label: string;
  dir: string;
  onDark: string;
  onLight: string;
  delay: number;
}) {
  const reveal = useReveal({ delay });
  const [copied, setCopied] = useState(false);
  const css =
    dir === 'radial'
      ? `radial-gradient(circle at 22% 22%, ${a}, ${b})`
      : `linear-gradient(${dir}, ${a}, ${b})`;
  // The ink is read against the END stop, which is where the label sits.
  const ink = pickFgOnBackground(b, [onDark, onLight]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`background: ${css};`);
    } catch {
      // Clipboard refused. The value is on screen and selectable either way.
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <button
      type="button"
      className="bi-grad"
      onClick={() => void copy()}
      aria-label={`Copy CSS for ${label}`}
      {...reveal}
      style={{ ...reveal.style, background: css, color: ink }}
    >
      <span className="bi-grad-label">{label}</span>
      <span className="bi-grad-copy" style={{ background: `${ink}22` }}>
        {copied ? 'Copied' : 'Copy CSS'}
      </span>
    </button>
  );
}
