import type { OnboardingAsset } from '../types';

const TILE_ICONS: Record<string, JSX.Element> = {
  file: (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  ),
  pdf: (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 15h6" />
    </svg>
  ),
  image: (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x={3} y={3} width={18} height={18} rx={2} />
      <circle cx={9} cy={9} r={1.5} />
      <path d="m21 15-5-5L5 21" />
    </svg>
  ),
  video: (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x={2} y={6} width={14} height={12} rx={2} />
      <path d="m22 8-6 4 6 4V8z" />
    </svg>
  ),
  audio: (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx={6} cy={18} r={3} />
      <circle cx={18} cy={16} r={3} />
    </svg>
  ),
  zip: (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M10 12v2" />
      <path d="M10 16v2" />
    </svg>
  ),
  font: (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7V4h16v3" />
      <path d="M9 20h6" />
      <path d="M12 4v16" />
    </svg>
  ),
  link: (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
      <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
    </svg>
  ),
};

interface Props {
  asset: OnboardingAsset;
  onRemove(id: string): void;
}

/** Sub line with a type word, mirroring the ✨ classifier tags: fonts say
 *  "font", logos keep their (specific) logo tag, recognized palettes keep
 *  "✨ palette", and everything else normalizes to "asset" — even when the
 *  classifier called it something vague like "other". */
function displaySub(asset: OnboardingAsset): string {
  const base = asset.sub.replace(/ · ✨ .*$/, '');
  const hadAiTag = base !== asset.sub;
  if (asset.kind === 'font') return `${base} · font`;
  if (asset.kind === 'image') {
    if (asset.isLogo || asset.logoSlot) return hadAiTag ? asset.sub : `${base} · logo`;
    if (asset.aiPlacement === 'colors') return asset.sub;
    return `${base} · ${hadAiTag ? '✨ asset' : 'asset'}`;
  }
  return asset.sub;
}

export function FileTile({ asset, onRemove }: Props) {
  if (asset.uploadStatus === 'uploading') {
    const pct = Math.round((asset.uploadProgress ?? 0) * 100);
    return (
      <div className="tile is-uploading" onClick={(e) => e.stopPropagation()}>
        <div className="tile-up-row">
          <span className="tile-up-label">Uploading…</span>
          <span className="tile-up-pct">{pct}%</span>
        </div>
        <div className="tile-up-name">{asset.name}</div>
        <div className="tile-progress">
          <div className="tile-progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }

  const hasPreview = !!asset.previewUrl;
  const subLine = displaySub(asset);
  return (
    <div className={`tile${hasPreview ? ' is-image' : ''}`} onClick={(e) => e.stopPropagation()}>
      {hasPreview ? (
        <>
          <div className="tile-preview" style={{ backgroundImage: `url(${asset.previewUrl})` }} />
          <div className="tile-meta">
            <div className="tile-name">{asset.name}</div>
            <div className="tile-sub">{subLine}</div>
          </div>
        </>
      ) : (
        <>
          <div className="tile-icon">{TILE_ICONS[asset.kind] ?? TILE_ICONS.file}</div>
          <div className="tile-meta">
            <div className="tile-name">{asset.name}</div>
            <div className="tile-sub">{subLine}</div>
          </div>
        </>
      )}
      <button
        type="button"
        className="tile-remove"
        aria-label={`Remove ${asset.name}`}
        onClick={(e) => {
          e.stopPropagation();
          onRemove(asset.id);
        }}
      >
        <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </div>
  );
}
