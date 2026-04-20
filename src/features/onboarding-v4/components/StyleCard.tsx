import { useMemo } from 'react';
import { STYLE_CARDS, poolForCard, fontStack } from '../data/styleCards';
import type { StyleCardState } from '../types';

interface Props {
  state: StyleCardState;
  brandName: string;
  onToggleLock(id: string): void;
}

export function StyleCard({ state, brandName, onToggleLock }: Props) {
  const def = useMemo(() => STYLE_CARDS.find((d) => d.id === state.id)!, [state.id]);
  const pool = useMemo(() => poolForCard(def), [def]);
  const font = pool[state.fontIdx % pool.length] || pool[0];
  const displayName = brandName.trim() || 'Your Brand';

  const nameStyle: React.CSSProperties = {
    color: def.fg,
    fontFamily: fontStack(font, def.families),
    fontWeight: font.weight,
    fontSize: `${def.nameSize}px`,
    letterSpacing: font.tracking || def.nameTracking || '-0.02em',
    fontStyle: font.italic || def.forceItalic ? 'italic' : 'normal',
    textTransform: font.case || 'none',
  };

  const sigStyle: React.CSSProperties | null = def.signature
    ? {
        color: def.muted,
        fontFamily: def.signature.font || fontStack(font, def.families),
        fontSize: `${def.signature.size}px`,
        letterSpacing: def.signature.tracking || '0',
        fontWeight: def.signature.weight || 400,
        fontStyle: def.signature.italic ? 'italic' : 'normal',
        textTransform: def.signature.transform || 'none',
      }
    : null;

  return (
    <div
      className={`style-card${state.locked ? ' is-locked' : ''}${state.locked ? '' : ' is-fresh'}`}
      data-card-id={def.id}
      onClick={() => onToggleLock(state.id)}
      role="button"
      aria-label={`${def.label} — ${state.locked ? 'selected, click to deselect' : 'click to select'}`}
    >
      <div className="sc-bg" style={{ background: def.bg }} />
      <div className="sc-inner" style={{ color: def.fg }}>
        {def.mark && <div className={`sc-mark sc-mark-${def.mark.type}`} style={def.mark.color ? { color: def.mark.color } : undefined} />}
        <div className={`sc-name${def.nameUnderline ? ' has-underline' : ''}`} style={nameStyle}>
          {displayName}
        </div>
        {def.signature && sigStyle && (
          <div className="sc-sub" style={sigStyle}>
            {def.signature.text}
          </div>
        )}
      </div>
      <span className="sc-lock-badge" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <rect x={5} y={11} width={14} height={10} rx={2} />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      </span>
    </div>
  );
}
