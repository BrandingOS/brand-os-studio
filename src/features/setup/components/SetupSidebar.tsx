import type { MockBrand } from '../data/mockBrand';
import { Check, Plus, Type, ImageIcon, Monitor, Camera, Globe, MessageCircle } from './SetupIcons';

type SectionKey = 'logo' | 'colors' | 'fonts' | 'icons' | 'photos' | 'website' | 'voice';

type Props = {
  brand: MockBrand;
  activeKey: SectionKey | null;
  completed: number;
  total: number;
  onJump: (key: SectionKey) => void;
};

type Entry = {
  key: SectionKey;
  groupLabel?: string;
  name: string;
  sub: string;
  thumb: React.ReactNode;
  thumbClass?: string;
  added: boolean;
};

export function SetupSidebar({ brand, activeKey, completed, total, onJump }: Props) {
  const displayLogo = brand.logos[0];
  const [c1, c2] = brand.colors.core;

  const entries: Entry[] = [
    {
      key: 'logo',
      groupLabel: 'Identity',
      name: 'Logo',
      sub: `${brand.logos.length} variants`,
      thumb: displayLogo ? (
        <span
          aria-hidden
          dangerouslySetInnerHTML={{ __html: displayLogo.svg }}
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <ImageIcon size={14} />
      ),
      added: brand.logos.length > 0,
    },
    {
      key: 'colors',
      name: 'Color',
      sub: `${brand.colors.core.length + brand.colors.accent.length} colors`,
      thumb: null,
      thumbClass: 'is-color',
      added: brand.colors.core.length > 0,
    },
    {
      key: 'fonts',
      name: 'Typography',
      sub: `${brand.fonts.display.family} · ${brand.fonts.text.family}`,
      thumb: <span>Aa</span>,
      thumbClass: 'is-font',
      added: !!brand.fonts.display && !!brand.fonts.text,
    },
    {
      key: 'icons',
      groupLabel: 'Style',
      name: 'Iconography',
      sub: `${brand.icons.length} icons`,
      thumb: <Type size={14} />,
      added: brand.icons.length > 0,
    },
    {
      key: 'photos',
      name: 'Photography',
      sub: `${brand.photos.length} references`,
      thumb: <Camera size={14} />,
      added: brand.photos.length > 0,
    },
    {
      key: 'website',
      groupLabel: 'Presence',
      name: 'Website',
      sub: brand.website.url || 'Not set',
      thumb: <Globe size={14} />,
      added: !!brand.website.url,
    },
    {
      key: 'voice',
      name: 'Voice & Tone',
      sub: `${brand.voice.pillars.length} pillars`,
      thumb: <MessageCircle size={14} />,
      added: brand.voice.essay.length > 0,
    },
  ];

  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  let lastGroup: string | undefined;

  return (
    <aside className="panel" aria-label="Brand setup progress">
      <div className="panel-top">
        <div className="panel-heading">
          <span className="panel-heading-eyebrow">Brand Setup</span>
          <h1 className="panel-heading-title">{brand.name}</h1>
        </div>
        <div className="panel-progress">
          <div className="panel-progress-head">
            <span className="panel-progress-label">Completion</span>
            <span className="panel-progress-count">
              {completed} / {total}
            </span>
          </div>
          <div className="panel-progress-bar">
            <div className="panel-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <nav className="panel-list">
        {entries.map((entry) => {
          const showGroup = entry.groupLabel && entry.groupLabel !== lastGroup;
          if (entry.groupLabel) lastGroup = entry.groupLabel;
          const isActive = activeKey === entry.key;

          const thumbStyle: React.CSSProperties | undefined =
            entry.thumbClass === 'is-color' && c1 && c2
              ? ({
                  ['--tc1' as never]: c1.hex,
                  ['--tc2' as never]: c2.hex,
                } as React.CSSProperties)
              : undefined;

          return (
            <div key={entry.key}>
              {showGroup && <div className="panel-group-label">{entry.groupLabel}</div>}
              <button
                type="button"
                className={`panel-item${isActive ? ' is-active' : ''}${entry.added ? '' : ' is-missing'}`}
                onClick={() => onJump(entry.key)}
              >
                <span className={`panel-item-thumb${entry.thumbClass ? ' ' + entry.thumbClass : ''}`} style={thumbStyle}>
                  {entry.thumb}
                </span>
                <span className="panel-item-meta">
                  <span className="panel-item-name">{entry.name}</span>
                  <span className="panel-item-sub">{entry.sub}</span>
                </span>
                <span className={`status-chip${entry.added ? ' is-added' : ' is-missing'}`}>
                  {entry.added ? <Check size={14} /> : <Plus size={14} />}
                </span>
              </button>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

export type { SectionKey };
