/**
 * Master Slide — visual reference of every typography role.
 *
 * Pure visual: no on-slide controls. The user edits each role in the
 * sidebar (Customize → Theme tab → Typography section); changes ripple
 * here and to every other slide via the deck-theme tokens.
 *
 * For per-element overrides on a specific slide, double-click the
 * text on that slide and use the inline FloatingToolbar.
 */

import type { CSSProperties } from 'react';
import {
  DECK_TYPE_ROLES,
  ROLE_LABEL,
  type DeckTypeRole,
} from '@/shared/presentation/theme/types';
import { Frame } from './_shared';
import type { SlideProps } from './_shared';

export function MasterSlideA({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="light">
      <div style={headerStyle}>
        <span className="deck-label">uniex</span>
        <span className="deck-label">MASTER STYLE — typography reference</span>
        <span className="deck-caption" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {String(index).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
      </div>
      <div style={ruleStyle} />

      <div style={specimensStyle}>
        {DECK_TYPE_ROLES.map((role) => (
          <Specimen key={role} role={role} sample={SAMPLE_BY_ROLE[role]} />
        ))}
      </div>

      <div style={hintStyle} className="deck-caption">
        Edit each role in the sidebar — Customize → Theme → Typography. Changes apply to every slide.
      </div>
    </Frame>
  );
}

const SAMPLE_BY_ROLE: Record<DeckTypeRole, string> = {
  display: 'Pitch Deck',
  h1:      'Section title goes here',
  h2:      'Subhead text',
  h3:      'Sub-subhead',
  h4:      'Small heading',
  body:    'The quick brown fox jumps over the lazy dog. هذا مثال للنص العربي للجمل الأساسية في العرض.',
  caption: 'Caption — small footer or meta · 14px reference',
  label:   'OVERLINE / SECTION TAG',
};

function Specimen({ role, sample }: { role: DeckTypeRole; sample: string }) {
  return (
    <div style={specimenRowStyle}>
      <span className="deck-label" style={{ color: 'rgba(0,21,99,0.42)' }}>
        {ROLE_LABEL[role]}
      </span>
      <span className={`deck-${role}`} style={{ display: 'block', maxWidth: 1280 }}>
        {sample}
      </span>
    </div>
  );
}

const headerStyle: CSSProperties = {
  position: 'absolute',
  top: 'var(--deck-chrome-pad-y, 64px)',
  left: 'var(--deck-chrome-pad-x, 96px)',
  right: 'var(--deck-chrome-pad-x, 96px)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  zIndex: 5,
};

const ruleStyle: CSSProperties = {
  position: 'absolute',
  top: 'calc(var(--deck-chrome-pad-y, 64px) + 24px)',
  left: 'var(--deck-chrome-pad-x, 96px)',
  right: 'var(--deck-chrome-pad-x, 96px)',
  height: 1,
  background: 'rgba(0,21,99,0.10)',
  zIndex: 5,
};

const specimensStyle: CSSProperties = {
  position: 'absolute',
  top: 168,
  left: 96,
  right: 96,
  bottom: 96,
  display: 'flex',
  flexDirection: 'column',
  gap: 28,
  overflow: 'hidden',
};

const specimenRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '220px 1fr',
  alignItems: 'baseline',
  gap: 24,
};

const hintStyle: CSSProperties = {
  position: 'absolute',
  bottom: 32,
  left: 96,
  right: 96,
  textAlign: 'center',
  opacity: 0.6,
};

export const MASTER_VARIANTS = {
  A: MasterSlideA,
  B: MasterSlideA,
  C: MasterSlideA,
  D: MasterSlideA,
  E: MasterSlideA,
};
