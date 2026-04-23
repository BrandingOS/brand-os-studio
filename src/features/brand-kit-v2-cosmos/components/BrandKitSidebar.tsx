import type { Brand } from '@/shared/types/brand';
import { Check } from '@/features/setup/components/SetupIcons';

export type KitSectionKey =
  | 'logo-system'
  | 'color-palette'
  | 'typography'
  | 'iconography'
  | 'photography'
  | 'brand-board'
  | 'voice-tone';

export const KIT_SECTIONS: { key: KitSectionKey; name: string }[] = [
  { key: 'logo-system', name: 'Logo System' },
  { key: 'color-palette', name: 'Color Palette' },
  { key: 'typography', name: 'Typography' },
  { key: 'iconography', name: 'Iconography' },
  { key: 'photography', name: 'Photography' },
  { key: 'brand-board', name: 'Brand Board' },
  { key: 'voice-tone', name: 'Voice & Tone' },
];

type Entry = {
  key: KitSectionKey;
  name: string;
  sub: string;
  added: boolean;
};

function buildEntries(brand: Brand | undefined): Entry[] {
  if (!brand) {
    return KIT_SECTIONS.map((s) => ({ key: s.key, name: s.name, sub: 'Not set', added: false }));
  }

  const logoCount = [
    brand.logoSystem?.primary,
    brand.logoSystem?.wordmark,
    brand.logoSystem?.iconmark,
    brand.logoSystem?.secondary,
  ].filter(Boolean).length || (brand.logo ? 1 : 0);

  const colorCount =
    (brand.primaryColor ? 1 : 0) +
    (brand.secondaryColor ? 1 : 0) +
    (brand.accentColor ? 1 : 0) +
    (brand.neutrals?.length ?? 0);

  const fontPrimary =
    brand.typography?.primary?.family ?? brand.fonts?.primary;
  const fontSecondary =
    brand.typography?.secondary?.family ?? brand.fonts?.secondary;
  const fontSummary = !fontPrimary
    ? 'Not set'
    : fontSecondary
    ? `${fontPrimary} · ${fontSecondary}`
    : fontPrimary;

  const iconExamples = brand.guidelines?.iconography?.examples ?? [];
  const iconCount = iconExamples.reduce(
    (sum, ex) => sum + (ex.icons?.length ?? 0),
    0,
  );

  const photoCount = (brand.brandAssets ?? [])
    .filter((a) => a.kind === 'image').length
    || (brand.assets ?? []).filter((a) => a.type === 'image').length;

  const hasBoard = !!(brand.uiStyle || (brand.neutrals && brand.neutrals.length > 0));

  const voiceAttrs = brand.guidelines?.voiceAndTone?.toneAttributes?.length ?? 0;
  const hasVoice = !!brand.tone || voiceAttrs > 0 || !!brand.guidelines?.voiceAndTone?.brandVoice;

  return [
    {
      key: 'logo-system',
      name: 'Logo System',
      sub: logoCount > 0 ? `${logoCount} variant${logoCount === 1 ? '' : 's'}` : 'Not set',
      added: logoCount > 0,
    },
    {
      key: 'color-palette',
      name: 'Color Palette',
      sub: colorCount > 0 ? `${colorCount} color${colorCount === 1 ? '' : 's'}` : 'Not set',
      added: colorCount > 0,
    },
    {
      key: 'typography',
      name: 'Typography',
      sub: fontSummary,
      added: !!fontPrimary,
    },
    {
      key: 'iconography',
      name: 'Iconography',
      sub: iconCount > 0 ? `${iconCount} icon${iconCount === 1 ? '' : 's'}` : 'Not set',
      added: iconCount > 0,
    },
    {
      key: 'photography',
      name: 'Photography',
      sub: photoCount > 0 ? `${photoCount} image${photoCount === 1 ? '' : 's'}` : 'Not set',
      added: photoCount > 0,
    },
    {
      key: 'brand-board',
      name: 'Brand Board',
      sub: hasBoard ? 'Configured' : 'Not set',
      added: hasBoard,
    },
    {
      key: 'voice-tone',
      name: 'Voice & Tone',
      sub: hasVoice ? (brand.tone ? 'Tone set' : 'Guidelines set') : 'Not set',
      added: hasVoice,
    },
  ];
}

type Props = {
  brand: Brand | undefined;
  activeKey: KitSectionKey | null;
  completed: number;
  total: number;
  onJump: (key: KitSectionKey) => void;
};

export function BrandKitSidebar({ brand, activeKey, completed, total, onJump }: Props) {
  const entries = buildEntries(brand);
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <aside className="panel" aria-label="Brand Kit sections">
      <div className="panel-top">
        <div className="panel-heading">
          <span className="panel-heading-eyebrow">Brand Kit</span>
          <h1 className="panel-heading-title">{brand?.name ?? 'Brand'}</h1>
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
          const isActive = activeKey === entry.key;
          return (
            <div
              key={entry.key}
              className={`panel-item${isActive ? ' is-active' : ''}${entry.added ? '' : ' is-missing'}`}
            >
              <button
                type="button"
                className="panel-item-body"
                onClick={() => onJump(entry.key)}
              >
                <span className="panel-item-meta">
                  <span className="panel-item-name">{entry.name}</span>
                  {entry.added && <span className="panel-item-sub">{entry.sub}</span>}
                </span>
              </button>
              <span className={`status-chip${entry.added ? ' is-added' : ' is-missing'}`}>
                <span className="chip-default">
                  {entry.added ? <Check size={14} /> : <OutlineRing size={12} />}
                </span>
              </span>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function OutlineRing({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeDasharray="2.5 2"
        fill="none"
      />
    </svg>
  );
}
