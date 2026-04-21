import { useCallback, useEffect, useRef, useState } from 'react';
import type { BrandColor, MockBrand } from '../data/mockBrand';
import { ArrowRight, ICON_MAP } from './SetupIcons';
import { ColorPickerHSV } from './ColorPickerHSV';
import type { SectionKey } from './SetupSidebar';

type ColorGroupKey = 'core' | 'accent' | 'grey';

function CopyIcon() {
  return (
    <svg
      className="swatch-copy-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  } catch {
    return false;
  }
}

/** Relative luminance check — swatches with light bg get dark text. */
function isLightHex(hex: string): boolean {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return l > 0.6;
}

function Section({
  dataKey,
  title,
  spec,
  onEdit,
  sectionRef,
  children,
}: {
  dataKey: SectionKey;
  title: string;
  spec: string;
  onEdit?: () => void;
  sectionRef?: (el: HTMLElement | null) => void;
  children: React.ReactNode;
}) {
  return (
    <section ref={sectionRef} className="section" data-key={dataKey}>
      <div className="section-header">
        <h2>{title}</h2>
        <span className="section-spec">{spec}</span>
        <button type="button" className="section-edit" onClick={onEdit}>
          Edit
          <ArrowRight size={11} />
        </button>
      </div>
      <div className="section-body">{children}</div>
    </section>
  );
}

export type SetupBoardRefs = Partial<Record<SectionKey, HTMLElement | null>>;

type Props = {
  brand: MockBrand;
  onEdit: (key: SectionKey) => void;
  sectionRefs: React.MutableRefObject<SetupBoardRefs>;
  onUpdateColor: (group: ColorGroupKey, index: number, hex: string) => void;
};

export function SetupBoard({ brand, onEdit, sectionRefs, onUpdateColor }: Props) {
  const setRef = (key: SectionKey) => (el: HTMLElement | null) => {
    sectionRefs.current[key] = el;
  };

  const iconMap = ICON_MAP();

  return (
    <main className="board-wrap" id="board">
      <header className="board-head">
        <div className="board-meta">
          <span className="board-live-dot" aria-hidden="true" />
          <span>
            <b>Live</b> preview
          </span>
        </div>
      </header>

      {/* ─── Logo ─── */}
      <Section sectionRef={setRef('logo')} dataKey="logo" title="Logo" spec="Primary · Variants" onEdit={() => onEdit('logo')}>
        <div className="logos">
          {brand.logos.map((logo) => (
            <div
              key={logo.id}
              className={`logo-tile${logo.variant === 'dark' ? ' is-dark' : ''}`}
              aria-label={logo.label}
            >
              <span
                className="logo-svg"
                dangerouslySetInnerHTML={{ __html: logo.svg }}
                style={{ display: 'block', width: '100%', height: '100%' }}
              />
            </div>
          ))}
          <button type="button" className="logo-tile is-empty" onClick={() => onEdit('logo')} aria-label="Add logo variant">
            <svg className="logo-tile-dash" aria-hidden="true">
              <rect />
            </svg>
            <span className="logo-tile-plus" aria-hidden="true">
              +
            </span>
          </button>
        </div>
      </Section>

      {/* ─── Color ─── */}
      <Section sectionRef={setRef('colors')} dataKey="colors" title="Color" spec="Core · Accent · Grey" onEdit={() => onEdit('colors')}>
        <div className="colors-stack">
          <ColorsGroup
            groupKey="core"
            layout="core"
            title="Core Colors"
            colors={brand.colors.core}
            onUpdateColor={onUpdateColor}
          />
          <ColorsGroup
            groupKey="accent"
            layout="accent"
            title="Accent Colors"
            colors={brand.colors.accent}
            onUpdateColor={onUpdateColor}
          />
          <ColorsGroup
            groupKey="grey"
            layout="grey"
            title="Neutral Colors"
            colors={brand.colors.grey}
            onUpdateColor={onUpdateColor}
          />
        </div>
      </Section>

      {/* ─── Typography ─── */}
      <Section sectionRef={setRef('fonts')} dataKey="fonts" title="Typography" spec="Display · Text" onEdit={() => onEdit('fonts')}>
        <div className="type-system">
          <TypeRow
            label="Display"
            family={brand.fonts.display.family}
            fallback={brand.fonts.display.fallback}
            weights={brand.fonts.display.weights}
            displayStyle={{ fontStyle: 'italic', fontWeight: 400 }}
          />
          <TypeRow
            label="Text"
            family={brand.fonts.text.family}
            fallback={brand.fonts.text.fallback}
            weights={brand.fonts.text.weights}
            displayStyle={{ fontWeight: 500 }}
          />
        </div>
      </Section>

      {/* ─── Iconography ─── */}
      <Section sectionRef={setRef('icons')} dataKey="icons" title="Iconography" spec="24 × 24px" onEdit={() => onEdit('icons')}>
        <div className="icon-grid">
          {brand.icons.map((name) => {
            const Icon = (iconMap as Record<string, (p: { size?: number }) => JSX.Element>)[name];
            if (!Icon) return null;
            return (
              <div key={name} className="icon-tile" aria-label={name}>
                <Icon size={22} />
              </div>
            );
          })}
        </div>
      </Section>

      {/* ─── Photography ─── */}
      <Section sectionRef={setRef('photos')} dataKey="photos" title="Photography" spec="Imagery & style" onEdit={() => onEdit('photos')}>
        <div className="photos">
          {brand.photos.map((photo) => (
            <div
              key={photo.id}
              className={`photo-tile${photo.span === 'wide' ? ' is-wide' : ''}${photo.span === 'tall' ? ' is-tall' : ''}`}
            >
              <img src={photo.src} alt="" loading="lazy" />
            </div>
          ))}
        </div>
      </Section>

      {/* ─── Website ─── */}
      <Section sectionRef={setRef('website')} dataKey="website" title="Website" spec="Reference" onEdit={() => onEdit('website')}>
        <div className="website-frame">
          <div className="website-chrome">
            <span className="chrome-dot" />
            <span className="chrome-dot" />
            <span className="chrome-dot" />
            <span className="chrome-url">{brand.website.url}</span>
          </div>
          <div className="website-body">
            <div className="website-fallback">
              <div className="website-fallback-mark">{brand.name.charAt(0)}</div>
              <div className="website-fallback-url">{brand.website.url}</div>
            </div>
          </div>
        </div>
      </Section>

      {/* ─── Voice & Tone ─── */}
      <Section sectionRef={setRef('voice')} dataKey="voice" title="Voice & Tone" spec="How we sound" onEdit={() => onEdit('voice')}>
        <div className="voice-block">
          <p className="voice-essay">{brand.voice.essay}</p>
          <div className="voice-card">
            <h3>Pillars</h3>
            <p>Four words our copy returns to — the North Star for tone.</p>
            <div className="voice-pills">
              {brand.voice.pillars.map((p) => (
                <span key={p} className="voice-pill">
                  {p}
                </span>
              ))}
            </div>
          </div>
          <div className="voice-card">
            <h3>Tone range</h3>
            <p>Warm but precise. We drop jargon, keep rigor. We sound like a thoughtful friend who knows the subject cold.</p>
          </div>
        </div>
      </Section>
    </main>
  );
}

type CopyFlash = { id: number; text: string; x: number; y: number };

function ColorsGroup({
  groupKey,
  layout,
  title,
  colors,
  onUpdateColor,
}: {
  groupKey: ColorGroupKey;
  layout: 'core' | 'accent' | 'grey';
  title: string;
  colors: BrandColor[];
  onUpdateColor: (group: ColorGroupKey, index: number, hex: string) => void;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [previewHex, setPreviewHex] = useState<string | null>(null);
  const [flash, setFlash] = useState<CopyFlash | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  const groupRef = useRef<HTMLDivElement>(null);

  // Outside click + Escape close the picker and revert the preview.
  useEffect(() => {
    if (activeIndex == null) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      if (groupRef.current?.contains(target)) return;
      setActiveIndex(null);
      setPreviewHex(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveIndex(null);
        setPreviewHex(null);
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [activeIndex]);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    };
  }, []);

  const handleSwatchClick = useCallback(
    (i: number) => {
      setActiveIndex((prev) => {
        if (prev === i) {
          setPreviewHex(null);
          return null;
        }
        setPreviewHex(null);
        return i;
      });
    },
    [],
  );

  const handleCopy = useCallback(async (text: string, anchor: HTMLElement) => {
    const ok = await copyToClipboard(text);
    if (!ok) return;
    const rect = anchor.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top;
    const id = Date.now() + Math.random();
    setFlash({ id, text: 'Copied!', x, y });
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => setFlash(null), 1200);
  }, []);

  const handleCommit = useCallback(
    (hex: string) => {
      if (activeIndex == null) return;
      onUpdateColor(groupKey, activeIndex, hex);
      setActiveIndex(null);
      setPreviewHex(null);
    },
    [activeIndex, groupKey, onUpdateColor],
  );

  const activeColor = activeIndex != null ? colors[activeIndex] : null;

  return (
    <div className="colors-group" ref={groupRef}>
      <p className="colors-group-title">{title}</p>
      <div className="colors-row" data-layout={layout}>
        {colors.map((c, i) => {
          const renderedHex = activeIndex === i && previewHex ? previewHex : c.hex;
          const light = isLightHex(renderedHex);
          const isActive = activeIndex === i;
          return (
            <button
              key={`${c.hex}-${i}`}
              type="button"
              className={`swatch${light ? ' is-light' : ''}${isActive ? ' is-active' : ''}`}
              style={{ background: renderedHex, zIndex: i + 1 }}
              aria-label={`Edit ${c.name} ${renderedHex}`}
              aria-expanded={isActive}
              onClick={(e) => {
                e.stopPropagation();
                handleSwatchClick(i);
              }}
            >
              <span
                className="swatch-name"
                role="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(c.name, e.currentTarget);
                }}
              >
                {c.name}
                <CopyIcon />
              </span>
              <span
                className="swatch-hex"
                role="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(renderedHex.toUpperCase(), e.currentTarget);
                }}
              >
                {renderedHex.toUpperCase()}
                <CopyIcon />
              </span>
            </button>
          );
        })}
      </div>
      <div className={`cp-expand${activeIndex != null ? ' is-open' : ''}`}>
        {activeColor && (
          <ColorPickerHSV
            key={`${groupKey}-${activeIndex}-${activeColor.hex}`}
            hex={activeColor.hex}
            onChange={(hex) => setPreviewHex(hex)}
            onCommit={handleCommit}
            onCancel={() => {
              setActiveIndex(null);
              setPreviewHex(null);
            }}
          />
        )}
      </div>
      {flash && (
        <div
          className="copy-flash is-on"
          style={{ left: flash.x, top: flash.y }}
          role="status"
          aria-live="polite"
        >
          {flash.text}
        </div>
      )}
    </div>
  );
}

function TypeRow({
  label,
  family,
  fallback,
  weights,
  displayStyle,
}: {
  label: string;
  family: string;
  fallback?: string;
  weights: string;
  displayStyle?: React.CSSProperties;
}) {
  const fontStack = `"${family}", ${fallback ?? 'sans-serif'}`;
  return (
    <div className="type-row">
      <div className="type-col">
        <p className="type-col-label">{label}</p>
        <p className="type-name" style={{ fontFamily: fontStack, ...displayStyle }}>
          {family}
        </p>
        <div className="type-glyphs">
          <p className="type-glyph type-glyph--lower" style={{ fontFamily: fontStack }}>
            abcdefghijklmnopqrstuvwxyz
          </p>
          <p className="type-glyph type-glyph--upper" style={{ fontFamily: fontStack }}>
            ABCDEFGHIJKLMNOPQRSTUVWXYZ
          </p>
          <p className="type-glyph type-glyph--num" style={{ fontFamily: fontStack }}>
            0123456789 — .,!?(&)
          </p>
        </div>
      </div>
      <div className="type-col">
        <p className="type-col-label">Weights</p>
        <ul className="type-list">
          {weights.split('·').map((w, i) => (
            <li key={i} style={{ fontFamily: fontStack }}>
              {w.trim()}
            </li>
          ))}
        </ul>
      </div>
      <div className="type-col">
        <p className="type-col-label">Specimen</p>
        <ul className="type-list">
          <li style={{ fontFamily: fontStack, fontSize: 22, lineHeight: 1.25 }}>
            The quick brown fox
          </li>
          <li style={{ fontFamily: fontStack }}>
            A brand has to sound like a person before it sounds like a company.
          </li>
        </ul>
      </div>
    </div>
  );
}
