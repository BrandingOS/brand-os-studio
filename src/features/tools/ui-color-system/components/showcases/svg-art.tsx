/**
 * svg-art — inline SVG illustrations used by showcase cards.
 *
 * Real Unsplash photos would make a prettier demo, but they hard-couple
 * the tool to external network availability. Instead we draw scene-level
 * SVG illustrations tinted by the active palette so the design always
 * renders — online, offline, inside an iframe, in a PDF export.
 *
 * Each shape accepts a pair of brand colors (light and deep stops from
 * the palette) so the illustrations feel part of the system rather than
 * pasted in.
 */

export function PhoneInHands({
  light,
  mid,
  deep,
  className,
}: {
  light: string;
  mid: string;
  deep: string;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden>
      <rect width="200" height="200" fill={light} />
      <circle cx="36" cy="42" r="50" fill={mid} opacity="0.35" />
      <circle cx="170" cy="180" r="66" fill={deep} opacity="0.15" />
      {/* arm/hand */}
      <path
        d="M24 190 C 45 150 95 150 100 128 L 108 108 C 114 96 120 92 130 94 L 150 100 L 148 130 L 130 140 L 120 190 Z"
        fill={deep}
        opacity="0.55"
      />
      {/* phone */}
      <rect x="104" y="86" width="46" height="66" rx="6" fill="#1a1a1a" />
      <rect x="108" y="92" width="38" height="52" rx="3" fill={mid} opacity="0.9" />
      <rect x="114" y="100" width="24" height="3" rx="1.5" fill={light} />
      <rect x="114" y="108" width="18" height="2" rx="1" fill={light} opacity="0.8" />
      <rect x="114" y="114" width="22" height="2" rx="1" fill={light} opacity="0.6" />
      <rect x="114" y="122" width="26" height="10" rx="2" fill={deep} />
    </svg>
  );
}

export function VRHeadset({
  light,
  mid,
  deep,
  className,
}: {
  light: string;
  mid: string;
  deep: string;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden>
      <rect width="200" height="200" fill={light} />
      <circle cx="165" cy="40" r="55" fill={mid} opacity="0.3" />
      <circle cx="40" cy="170" r="60" fill={deep} opacity="0.15" />
      {/* head shape */}
      <ellipse cx="100" cy="110" rx="52" ry="62" fill="#f5d0b0" />
      {/* shirt */}
      <path d="M40 180 Q 100 150 160 180 L 160 200 L 40 200 Z" fill="#f1f1ee" />
      {/* vr headset */}
      <rect x="55" y="78" width="90" height="40" rx="10" fill={deep} />
      <rect x="60" y="84" width="38" height="28" rx="5" fill="#000" />
      <rect x="102" y="84" width="38" height="28" rx="5" fill="#000" />
      <path d="M45 95 Q 50 85 60 88" stroke={deep} strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M155 95 Q 150 85 140 88" stroke={deep} strokeWidth="4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function TwoPeopleAtLaptop({
  light,
  mid,
  deep,
  className,
}: {
  light: string;
  mid: string;
  deep: string;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden>
      <rect width="200" height="200" fill={light} />
      <rect x="0" y="0" width="200" height="90" fill={mid} opacity="0.3" />
      {/* window */}
      <rect x="20" y="16" width="76" height="58" rx="4" fill="#fff" opacity="0.6" />
      <rect x="104" y="16" width="76" height="58" rx="4" fill="#fff" opacity="0.6" />
      {/* table */}
      <rect x="0" y="150" width="200" height="50" fill={deep} opacity="0.25" />
      {/* person left */}
      <circle cx="60" cy="100" r="22" fill="#f5d0b0" />
      <path d="M30 160 Q 60 120 90 160 L 100 200 L 20 200 Z" fill="#e8dfd6" />
      {/* person right */}
      <circle cx="140" cy="100" r="22" fill="#f0c59a" />
      <path d="M110 160 Q 140 120 170 160 L 180 200 L 100 200 Z" fill={deep} opacity="0.55" />
      {/* laptop */}
      <rect x="74" y="136" width="52" height="28" rx="2" fill="#2a2a2a" />
      <rect x="78" y="140" width="44" height="20" rx="1" fill={mid} />
      <rect x="68" y="160" width="64" height="4" rx="2" fill="#3a3a3a" />
    </svg>
  );
}

export function MacBookArt({
  light,
  mid,
  deep,
  className,
}: {
  light: string;
  mid: string;
  deep: string;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 200 140" className={className} aria-hidden>
      <rect width="200" height="140" fill={light} />
      <ellipse cx="100" cy="120" rx="80" ry="8" fill={deep} opacity="0.15" />
      {/* laptop screen */}
      <rect x="35" y="18" width="130" height="80" rx="4" fill="#18181b" />
      <rect x="38" y="21" width="124" height="74" rx="2" fill="#0a0a0a" />
      {/* colorful desktop */}
      <path d="M38 64 Q 80 40 100 54 T 162 40 L 162 93 L 38 93 Z" fill={mid} opacity="0.8" />
      <path d="M38 76 Q 75 60 100 68 T 162 60 L 162 93 L 38 93 Z" fill={deep} opacity="0.9" />
      <rect x="38" y="21" width="124" height="74" fill="url(#mbRef)" opacity="0.05" />
      {/* laptop base */}
      <path d="M28 98 L 172 98 L 180 106 L 20 106 Z" fill="#d1d5db" />
      <path d="M20 106 L 180 106 L 178 108 L 22 108 Z" fill="#9ca3af" />
      {/* notch */}
      <rect x="92" y="18" width="16" height="3" rx="1.5" fill="#0a0a0a" />
      <defs>
        <linearGradient id="mbRef" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function OrbitArt({
  light,
  mid,
  deep,
  className,
}: {
  light: string;
  mid: string;
  deep: string;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden>
      <rect width="200" height="200" fill={light} />
      <circle cx="100" cy="100" r="78" fill="none" stroke={mid} strokeWidth="1" opacity="0.6" />
      <circle cx="100" cy="100" r="60" fill="none" stroke={mid} strokeWidth="1" opacity="0.4" />
      <circle cx="100" cy="100" r="40" fill="none" stroke={mid} strokeWidth="1" opacity="0.3" />
      <circle cx="100" cy="100" r="24" fill={deep} />
      <circle cx="100" cy="100" r="16" fill={mid} />
      <circle cx="178" cy="100" r="6" fill={deep} />
      <circle cx="60" cy="40" r="4" fill={deep} opacity="0.8" />
      <circle cx="140" cy="170" r="5" fill={deep} opacity="0.6" />
    </svg>
  );
}

export function SoundWaveArt({
  light,
  mid,
  deep,
  className,
}: {
  light: string;
  mid: string;
  deep: string;
  className?: string;
}) {
  const bars = [12, 28, 42, 60, 40, 70, 55, 38, 48, 24, 60, 34, 46, 22, 54];
  return (
    <svg viewBox="0 0 200 100" className={className} aria-hidden>
      <rect width="200" height="100" fill={light} />
      {bars.map((h, i) => (
        <rect
          key={i}
          x={8 + i * 12}
          y={50 - h / 2}
          width="7"
          height={h}
          rx="2"
          fill={i % 2 === 0 ? deep : mid}
        />
      ))}
    </svg>
  );
}
