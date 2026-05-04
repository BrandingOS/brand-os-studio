import './BrandSetupSidebar.css';

export type SectionKey =
  | 'logo'
  | 'colors'
  | 'fonts'
  | 'icons'
  | 'photos'
  | 'website'
  | 'voice';

export type Section = {
  key: SectionKey;
  name: string;
  subtitle: string;
  filled: boolean;
};

type Props = {
  brandName: string;
  sections: Section[];
  logoLetter?: string;
  colors?: { c1: string; c2: string };
};

export function BrandSetupSidebar({ brandName, sections, logoLetter, colors }: Props) {
  const filled = sections.filter((s) => s.filled);
  const empty = sections.filter((s) => !s.filled);
  const ordered = [...filled, ...empty];

  const total = sections.length;
  const completed = filled.length;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <aside className="bss" aria-label="Brand setup progress">
      <div className="bss-header">
        <span className="bss-eyebrow">Brand Setup</span>
        <h1 className="bss-title">{brandName}</h1>
        <div className="bss-progress">
          <div className="bss-progress-row">
            <span className="bss-progress-label">Completion</span>
            <span className="bss-progress-count">
              {completed} / {total}
            </span>
          </div>
          <div className="bss-progress-bar">
            <div className="bss-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <ul className="bss-list">
        {ordered.map((section) => (
          <li
            key={section.key}
            className={`bss-item ${section.filled ? 'is-filled' : 'is-empty'}`}
          >
            <span className="bss-tile-slot">
              {section.filled && (
                <Tile section={section} logoLetter={logoLetter} colors={colors} />
              )}
            </span>

            <span className="bss-text">
              <span className="bss-name">{section.name}</span>
              {section.filled && <span className="bss-sub">{section.subtitle}</span>}
            </span>

            <span className="bss-status">
              {section.filled ? <CheckIcon /> : <LoadingRing />}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function Tile({
  section,
  logoLetter,
  colors,
}: {
  section: Section;
  logoLetter?: string;
  colors?: { c1: string; c2: string };
}) {
  switch (section.key) {
    case 'logo':
      return <span className="bss-tile bss-tile--logo">{logoLetter ?? 'R'}</span>;
    case 'colors':
      return (
        <span
          className="bss-tile bss-tile--colors"
          style={{
            background: `linear-gradient(135deg, ${colors?.c1 ?? '#111111'} 0 50%, ${
              colors?.c2 ?? '#e9e6dc'
            } 50% 100%)`,
          }}
        />
      );
    case 'fonts':
      return <span className="bss-tile bss-tile--fonts">Aa</span>;
    case 'icons':
      return (
        <span className="bss-tile bss-tile--icons">
          <StarOutlineIcon />
        </span>
      );
    case 'photos':
      return <span className="bss-tile bss-tile--photos" aria-hidden />;
    case 'website':
      return (
        <span className="bss-tile bss-tile--website">
          <LinkIcon />
        </span>
      );
    case 'voice':
      return (
        <span className="bss-tile bss-tile--voice">
          <RectangleIcon />
        </span>
      );
  }
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="7.5" fill="#1f9d5a" />
      <path
        d="M4.5 8.2 L6.9 10.6 L11.5 5.8"
        stroke="#ffffff"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function LoadingRing() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="#c9c5b7"
        strokeWidth="1.3"
        strokeDasharray="3 3"
        fill="none"
      />
    </svg>
  );
}

function StarOutlineIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3.5 L14.6 9 L20.5 9.8 L16.2 13.9 L17.3 19.7 L12 16.9 L6.7 19.7 L7.8 13.9 L3.5 9.8 L9.4 9 Z"
        stroke="#2b2924"
        strokeWidth="1.4"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10.5 13.5 a4 4 0 0 0 5.66 0 l2.83 -2.83 a4 4 0 0 0 -5.66 -5.66 l-1.41 1.41"
        stroke="#2b2924"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M13.5 10.5 a4 4 0 0 0 -5.66 0 l-2.83 2.83 a4 4 0 0 0 5.66 5.66 l1.41 -1.41"
        stroke="#2b2924"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function RectangleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="4"
        y="6"
        width="16"
        height="12"
        rx="1.5"
        stroke="#2b2924"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
}
