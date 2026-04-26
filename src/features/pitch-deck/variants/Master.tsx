/**
 * Master Slide — the deck's typography style master.
 *
 * Shows specimens of every typography role (display, h1, h2, h3, body,
 * caption, label) using the live `.deck-*` classes, plus inline pickers
 * for heading/body font + weight, a scale slider, and a density toggle.
 * Editing any control writes to the deck theme via `useDeckTheme`, so
 * the change ripples to every other slide in the deck.
 *
 * The slide reads its brand via the URL slug rather than a prop because
 * `VARIANTS[kind][key]` is invoked with only `index`/`total`. Theme
 * state comes from the same Zustand store the side panel uses, so the
 * master slide and the panel stay in sync automatically.
 */

import { useParams } from 'react-router-dom';
import type { CSSProperties, ReactNode } from 'react';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { useDeckTheme } from '@/shared/presentation/theme/useDeckTheme';
import {
  ensureFontLoaded,
  findDeckFont,
  groupedDeckFonts,
  kindLabel,
} from '@/shared/presentation/theme/panels/fontCatalog';
import { Slider } from '@/components/ui/slider';
import type {
  DeckDensity,
  PresentationTheme,
} from '@/shared/presentation/theme/types';
import { Frame } from './_shared';
import type { SlideProps } from './_shared';

const HEADING_WEIGHTS = [300, 400, 500, 600, 700, 800] as const;
const BODY_WEIGHTS = [400, 500, 600] as const;

export function MasterSlideA({ index, total }: SlideProps) {
  const { slug } = useParams<{ slug: string }>();
  const { brand } = useBrandBySlug(slug);

  // The master slide is rendered inside PitchDeckPage's brand-gated
  // shell — brand should always be defined by the time we render —
  // but guard so a transient render doesn't crash.
  if (!brand) {
    return (
      <Frame index={index} variant="light">
        <div style={fillerStyle}>Loading brand…</div>
      </Frame>
    );
  }

  return <MasterContent brand={brand} index={index} total={total} />;
}

function MasterContent({
  brand,
  index,
  total,
}: {
  brand: ReturnType<typeof useBrandBySlug>['brand'] & object;
  index: number;
  total: number;
}) {
  const { theme, patch } = useDeckTheme(brand, 'pitch-deck');

  const setHeadingFont = (family: string | undefined) => {
    if (family) ensureFontLoaded(family);
    patch({ typography: { ...theme.typography, headingFont: family } });
  };
  const setBodyFont = (family: string | undefined) => {
    if (family) ensureFontLoaded(family);
    patch({ typography: { ...theme.typography, bodyFont: family } });
  };
  const setHeadingWeight = (w: number) =>
    patch({ typography: { ...theme.typography, headingWeight: w } });
  const setBodyWeight = (w: number) =>
    patch({ typography: { ...theme.typography, bodyWeight: w } });
  const setScale = (n: number) =>
    patch({ typography: { ...theme.typography, scaleMultiplier: n } });
  const setLeading = (n: number) =>
    patch({ typography: { ...theme.typography, leadingMultiplier: n } });
  const setDensity = (d: DeckDensity) => patch({ density: d });

  return (
    <Frame index={index} variant="light">
      {/* Custom header (not PageChrome — the master slide has its own
          banner so the role is unmistakable). */}
      <div style={headerStyle}>
        <span className="deck-label" style={{ letterSpacing: '0.06em' }}>
          uniex
        </span>
        <span className="deck-label" style={{ letterSpacing: '0.32em' }}>
          MASTER STYLE
        </span>
        <span className="deck-caption" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {String(index).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
      </div>
      <div style={ruleStyle} />

      {/* Two columns of specimens + their group controls */}
      <div style={columnsStyle}>
        {/* HEADING column */}
        <SpecimenColumn
          title="HEADING"
          controls={
            <>
              <FontPick
                value={theme.typography.headingFont}
                onChange={setHeadingFont}
              />
              <Segmented<number>
                value={theme.typography.headingWeight}
                options={HEADING_WEIGHTS.map((w) => ({ value: w, label: String(w) }))}
                onChange={setHeadingWeight}
              />
            </>
          }
          specimens={
            <>
              <Specimen role="display" sample="Pitch Deck" />
              <Specimen role="h1" sample="Section Title" />
              <Specimen role="h2" sample="Subhead" />
              <Specimen role="h3" sample="Sub-subhead" />
            </>
          }
        />

        {/* BODY column */}
        <SpecimenColumn
          title="BODY"
          controls={
            <>
              <FontPick
                value={theme.typography.bodyFont}
                onChange={setBodyFont}
              />
              <Segmented<number>
                value={theme.typography.bodyWeight}
                options={BODY_WEIGHTS.map((w) => ({ value: w, label: String(w) }))}
                onChange={setBodyWeight}
              />
            </>
          }
          specimens={
            <>
              <Specimen
                role="body"
                sample="The quick brown fox jumps over the lazy dog. هذا مثال للنص العربي."
              />
              <Specimen role="caption" sample="Caption / footer meta — small text · 12 / 13" />
              <Specimen role="label" sample="OVERLINE / SECTION TAG" />
            </>
          }
        />
      </div>

      {/* Bottom: global scale + line-height + density */}
      <div style={bottomStripStyle}>
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="deck-label">Scale {theme.typography.scaleMultiplier.toFixed(2)}×</span>
          <div data-editor-chrome="true" onPointerDown={(e) => e.stopPropagation()}>
            <Slider
              min={0.85}
              max={1.5}
              step={0.05}
              value={[theme.typography.scaleMultiplier]}
              onValueChange={([v]) => setScale(Number(v))}
            />
          </div>
        </div>
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="deck-label">Line-height {theme.typography.leadingMultiplier.toFixed(2)}×</span>
          <div data-editor-chrome="true" onPointerDown={(e) => e.stopPropagation()}>
            <Slider
              min={0.85}
              max={1.35}
              step={0.05}
              value={[theme.typography.leadingMultiplier]}
              onValueChange={([v]) => setLeading(Number(v))}
            />
          </div>
        </div>
        <div style={{ flex: 3, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="deck-label">Density</span>
          <Segmented<DeckDensity>
            value={theme.density}
            options={[
              { value: 'compact', label: 'Compact' },
              { value: 'comfortable', label: 'Comfortable' },
              { value: 'spacious', label: 'Spacious' },
            ]}
            onChange={setDensity}
          />
        </div>
      </div>

      <div style={footerHintStyle} className="deck-caption">
        Edit anything here — the change ripples to every slide in this deck.
      </div>
    </Frame>
  );
}

/* ───────────────────────── helpers ───────────────────────── */

function SpecimenColumn({
  title,
  controls,
  specimens,
}: {
  title: string;
  controls: ReactNode;
  specimens: ReactNode;
}) {
  return (
    <div style={columnStyle}>
      <div className="deck-label">{title}</div>
      <div
        style={controlsRowStyle}
        data-editor-chrome="true"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {controls}
      </div>
      <div style={specimensStackStyle}>{specimens}</div>
    </div>
  );
}

function Specimen({
  role,
  sample,
}: {
  role: 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label';
  sample: string;
}) {
  const className = `deck-${role}`;
  return (
    <div style={specimenRowStyle}>
      <span style={specimenLabelStyle} className="deck-label">{role}</span>
      <span className={className} style={specimenTextStyle(role)}>
        {sample}
      </span>
    </div>
  );
}

function FontPick({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (family: string | undefined) => void;
}) {
  const current = findDeckFont(value);
  const grouped = groupedDeckFonts();
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || undefined)}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        height: 36,
        padding: '0 12px',
        border: '1px solid rgba(0,21,99,0.18)',
        borderRadius: 8,
        background: '#fff',
        fontSize: 13,
        fontFamily: current?.family ?? 'inherit',
        cursor: 'pointer',
        minWidth: 200,
      }}
    >
      <option value="">Inherit from brand</option>
      {grouped.map((group) => (
        <optgroup key={group.kind} label={kindLabel(group.kind)}>
          {group.fonts.map((f) => (
            <option key={f.label} value={f.family}>
              {f.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T | undefined;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        height: 36,
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid rgba(0,21,99,0.18)',
      }}
      data-editor-chrome="true"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(opt.value);
            }}
            style={{
              padding: '0 14px',
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              borderRight: '1px solid rgba(0,21,99,0.10)',
              background: active ? '#001563' : '#fff',
              color: active ? '#fff' : 'rgba(0,21,99,0.72)',
              cursor: 'pointer',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ───────────────────────── styles ───────────────────────── */

const fillerStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 18,
  color: 'rgba(0,21,99,0.5)',
};

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

const columnsStyle: CSSProperties = {
  position: 'absolute',
  top: 168,
  left: 96,
  right: 96,
  bottom: 264,
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 64,
};

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
};

const controlsRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 12,
  alignItems: 'center',
};

const specimensStackStyle: CSSProperties = {
  marginTop: 18,
  display: 'flex',
  flexDirection: 'column',
  gap: 24,
};

const specimenRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '92px 1fr',
  alignItems: 'baseline',
  gap: 16,
};

const specimenLabelStyle: CSSProperties = {
  color: 'rgba(0,21,99,0.42)',
};

const specimenTextStyle = (role: string): CSSProperties => {
  // Cap caption/body sample width so wrapping reads naturally on
  // 1920px slides; the .deck-* classes alone don't constrain width.
  if (role === 'body' || role === 'caption') {
    return { display: 'block', maxWidth: 720 };
  }
  return {};
};

const bottomStripStyle: CSSProperties = {
  position: 'absolute',
  bottom: 96,
  left: 96,
  right: 96,
  display: 'flex',
  gap: 32,
  alignItems: 'flex-start',
};

const footerHintStyle: CSSProperties = {
  position: 'absolute',
  bottom: 32,
  left: 96,
  right: 96,
  textAlign: 'center',
  opacity: 0.6,
};

/* Variant registry — all five keys point at the same component
 * because the master slide doesn't have alternate compositions; the
 * variant chips in the dock are a no-op for it. */
export const MASTER_VARIANTS = {
  A: MasterSlideA,
  B: MasterSlideA,
  C: MasterSlideA,
  D: MasterSlideA,
  E: MasterSlideA,
};
