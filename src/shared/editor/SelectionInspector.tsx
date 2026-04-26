/**
 * SelectionInspector — selection-aware property panel for the active
 * inline-editable slide.
 *
 * Reads styles from the live HTMLElement (NOT from React state) and
 * mutates `element.style[*]` directly. The MutationObserver inside
 * `InlineEditableSlide` picks up the mutation and pushes it through
 * the same history+save pipeline as a manual edit.
 *
 * Re-renders are driven by:
 *   - The `selection` prop changing (different element selected, or
 *     cleared)
 *   - A local "tick" bumped after each mutation, so the panel reflects
 *     the value the user just dialed in
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ImageUp,
  Italic,
  RotateCcw,
  Trash2,
  Type as TypeIcon,
} from 'lucide-react';
import type { SelectedElement } from './blocks/EditableSlide';

interface SelectionInspectorProps {
  selection: SelectedElement | null;
  onClearSelection?: () => void;
}

const FONT_WEIGHTS = [
  { label: 'Thin', value: '300' },
  { label: 'Regular', value: '400' },
  { label: 'Medium', value: '500' },
  { label: 'Semi', value: '600' },
  { label: 'Bold', value: '700' },
  { label: 'Black', value: '800' },
];

const FONT_FAMILIES = [
  { label: 'IBM Plex Arabic', value: '"IBM Plex Sans Arabic", system-ui, sans-serif' },
  { label: 'Cairo', value: '"Cairo", system-ui, sans-serif' },
  { label: 'Inter', value: '"Inter", system-ui, sans-serif' },
  { label: 'Serif', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Mono', value: '"JetBrains Mono", "Courier New", monospace' },
];

export function SelectionInspector({ selection, onClearSelection }: SelectionInspectorProps) {
  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);

  // When the selected element is detached (e.g. user undid the action
  // that created it), drop selection. We poll on tick for cheap; the
  // host also has its own connectedness checks.
  useEffect(() => {
    if (!selection) return;
    if (!selection.element.isConnected) {
      onClearSelection?.();
    }
  }, [selection, tick, onClearSelection]);

  const computed = useMemo(() => {
    if (!selection) return null;
    return window.getComputedStyle(selection.element);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, tick]);

  if (!selection || !computed) {
    return (
      <div style={{ padding: '20px 4px', color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.6 }}>
        <div style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: 13, marginBottom: 8 }}>
          Nothing selected
        </div>
        Click any text, image, or block on the slide to edit it. Double-click text to type. Drag to reposition.
      </div>
    );
  }

  const el = selection.element;
  const isText = selection.type === 'text' || selection.type === 'heading';
  const isImage = selection.type === 'image' || selection.type === 'logo';

  // Inline style takes precedence over computed for round-tripping the
  // user's own previous edits — `getComputedStyle` returns the cascaded
  // value, which is fine for "what does this look like now," but inline
  // style values are what we WROTE, so they're what we should READ as
  // the source of truth for inputs.
  const readStyle = (key: keyof CSSStyleDeclaration) => {
    return (el.style[key] as string) || (computed[key] as string) || '';
  };

  const set = (key: string, value: string) => {
    (el.style as any)[key] = value;
    bump();
  };

  /**
   * Wipe inline style overrides set on this element so it inherits
   * from the .deck-* role token again (font, size, weight, color,
   * line-height, letter-spacing, width/height).  Caller's preserved:
   * positioning (left/top/transform), background, opacity, etc.
   */
  const resetToDefault = () => {
    const props = [
      'fontFamily',
      'fontSize',
      'fontWeight',
      'fontStyle',
      'lineHeight',
      'letterSpacing',
      'textAlign',
      'color',
      'width',
      'height',
      'maxWidth',
      'maxHeight',
      'minWidth',
      'minHeight',
    ] as const;
    for (const k of props) {
      el.style.removeProperty(k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`));
    }
    bump();
  };

  const hasInlineOverrides = (() => {
    const props = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textAlign', 'color', 'width', 'height'];
    return props.some((p) => (el.style as any)[p]);
  })();

  const fontSizePx = parseFloat(readStyle('fontSize') as string) || 16;
  const fontWeight = String(readStyle('fontWeight') || '400');
  const fontStyle = readStyle('fontStyle') as string;
  const textAlign = readStyle('textAlign') as string;
  const color = el.style.color || rgbToHex(computed.color);
  const bg = el.style.backgroundColor || rgbToHex(computed.backgroundColor);
  const fontFamily = readStyle('fontFamily') as string;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.32em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Layer
          </div>
          {hasInlineOverrides && (
            <button
              type="button"
              onClick={resetToDefault}
              title="Reset this element back to the theme default"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 999,
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={11} /> Reset
            </button>
          )}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <TagBadge type={selection.type} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {summarizeElement(el)}
          </span>
        </div>
      </div>

      <Section title="Size">
        <Field label="Width × Height (px)">
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="number"
              min={10}
              max={2400}
              placeholder="Auto"
              value={el.style.width ? parseInt(el.style.width, 10) : ''}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) el.style.removeProperty('width');
                else el.style.width = `${v}px`;
                bump();
              }}
              style={{ ...numberStyle, flex: 1 }}
            />
            <span style={{ alignSelf: 'center', color: 'var(--text-muted)', fontSize: 12 }}>×</span>
            <input
              type="number"
              min={10}
              max={2400}
              placeholder="Auto"
              value={el.style.height ? parseInt(el.style.height, 10) : ''}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) el.style.removeProperty('height');
                else el.style.height = `${v}px`;
                bump();
              }}
              style={{ ...numberStyle, flex: 1 }}
            />
            <button
              type="button"
              onClick={() => {
                el.style.removeProperty('width');
                el.style.removeProperty('height');
                bump();
              }}
              title="Reset to auto"
              style={{
                padding: '0 10px',
                fontSize: 11,
                border: '1px solid var(--border)',
                borderRadius: 6,
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Auto
            </button>
          </div>
        </Field>
        <Field label="Quick width">
          <div style={{ display: 'flex', gap: 4 }}>
            {[400, 600, 800, 1200, 1600].map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => set('width', `${w}px`)}
                style={chipStyle(el.style.width === `${w}px`)}
                title={`${w}px wide`}
              >
                {w}
              </button>
            ))}
          </div>
        </Field>
      </Section>

      {isText && (
        <>
          <Section title="Typography">
            <Field label="Family">
              <select
                value={fontFamily}
                onChange={(e) => set('fontFamily', e.target.value)}
                style={selectStyle}
              >
                <option value="">Default</option>
                {FONT_FAMILIES.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Size">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="range"
                  min={10}
                  max={200}
                  step={1}
                  value={fontSizePx}
                  onChange={(e) => set('fontSize', `${e.target.value}px`)}
                  style={{ flex: 1 }}
                />
                <input
                  type="number"
                  min={10}
                  max={400}
                  value={Math.round(fontSizePx)}
                  onChange={(e) => set('fontSize', `${e.target.value}px`)}
                  style={{ ...numberStyle, width: 64 }}
                />
              </div>
            </Field>
            <Field label="Weight">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {FONT_WEIGHTS.map((w) => (
                  <button
                    key={w.value}
                    type="button"
                    onClick={() => set('fontWeight', w.value)}
                    style={chipStyle(fontWeight === w.value)}
                    title={w.label}
                  >
                    {w.value}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Style">
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  type="button"
                  onClick={() => set('fontWeight', fontWeight === '700' ? '400' : '700')}
                  style={iconBtnStyle(fontWeight === '700' || parseInt(fontWeight) >= 700)}
                  title="Bold"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => set('fontStyle', fontStyle === 'italic' ? 'normal' : 'italic')}
                  style={iconBtnStyle(fontStyle === 'italic')}
                  title="Italic"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
              </div>
            </Field>
            <Field label="Alignment">
              <div style={{ display: 'flex', gap: 4 }}>
                {([
                  ['right', AlignRight],
                  ['center', AlignCenter],
                  ['left', AlignLeft],
                ] as const).map(([val, Icon]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => set('textAlign', val)}
                    style={iconBtnStyle(textAlign === val)}
                    title={`Align ${val}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Color">
              <ColorRow value={color} onChange={(v) => set('color', v)} />
            </Field>
            <Field label="Letter spacing">
              <input
                type="range"
                min={-4}
                max={20}
                step={0.5}
                value={parseFloat(readStyle('letterSpacing') as string) || 0}
                onChange={(e) => set('letterSpacing', `${e.target.value}px`)}
                style={{ width: '100%' }}
              />
            </Field>
          </Section>
        </>
      )}

      {isImage && (
        <Section title="Image">
          <Field label="Replace">
            <ReplaceImageButton el={el} onChanged={bump} />
          </Field>
          <Field label="Fit">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {(['cover', 'contain', 'fill', 'none'] as const).map((fit) => (
                <button
                  key={fit}
                  type="button"
                  onClick={() => set('objectFit', fit)}
                  style={chipStyle((readStyle('objectFit') as string) === fit)}
                >
                  {fit}
                </button>
              ))}
            </div>
          </Field>
        </Section>
      )}

      <Section title="Background">
        <Field label="Fill">
          <ColorRow value={bg} onChange={(v) => set('backgroundColor', v)} allowClear onClear={() => set('backgroundColor', 'transparent')} />
        </Field>
      </Section>

      <Section title="Position">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Field label="X">
            <input
              type="number"
              value={Math.round(parseFloat(readStyle('left') as string) || 0)}
              onChange={(e) => set('left', `${e.target.value}px`)}
              style={numberStyle}
            />
          </Field>
          <Field label="Y">
            <input
              type="number"
              value={Math.round(parseFloat(readStyle('top') as string) || 0)}
              onChange={(e) => set('top', `${e.target.value}px`)}
              style={numberStyle}
            />
          </Field>
        </div>
        <button
          type="button"
          onClick={() => {
            el.style.left = '';
            el.style.top = '';
            bump();
          }}
          style={ghostBtnStyle}
        >
          Reset position
        </button>
      </Section>

      <Section title="Size">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Field label="Width">
            <input
              type="number"
              value={Math.round(el.offsetWidth)}
              onChange={(e) => set('width', `${e.target.value}px`)}
              style={numberStyle}
            />
          </Field>
          <Field label="Height">
            <input
              type="number"
              value={Math.round(el.offsetHeight)}
              onChange={(e) => set('height', `${e.target.value}px`)}
              style={numberStyle}
            />
          </Field>
        </div>
      </Section>

      <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <button
          type="button"
          onClick={() => {
            el.remove();
            onClearSelection?.();
          }}
          style={{ ...ghostBtnStyle, color: '#dc2626', borderColor: 'rgba(220, 38, 38, 0.3)' }}
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete layer
        </button>
      </div>
    </div>
  );
}

function ColorRow({ value, onChange, allowClear, onClear }: { value: string; onChange: (v: string) => void; allowClear?: boolean; onClear?: () => void }) {
  const safe = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input
        type="color"
        value={safe}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 36, height: 28, padding: 0, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', background: 'transparent' }}
      />
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#000000"
        style={{ flex: 1, ...numberStyle, fontFamily: 'monospace', fontSize: 11 }}
      />
      {allowClear && (
        <button type="button" onClick={onClear} style={{ ...ghostBtnStyle, padding: '4px 8px', height: 28, fontSize: 10 }}>
          ✕
        </button>
      )}
    </div>
  );
}

function ReplaceImageButton({ el, onChanged }: { el: HTMLElement; onChanged: () => void }) {
  return (
    <label style={{ ...ghostBtnStyle, cursor: 'pointer' }}>
      <ImageUp className="w-3.5 h-3.5" />
      <span>Choose image…</span>
      <input
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            if (el.tagName === 'IMG') {
              (el as HTMLImageElement).src = dataUrl;
            } else {
              el.style.backgroundImage = `url(${dataUrl})`;
              el.style.backgroundSize = 'cover';
              el.style.backgroundPosition = 'center';
            }
            onChanged();
          };
          reader.readAsDataURL(f);
        }}
      />
    </label>
  );
}

function TagBadge({ type }: { type: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 999,
        background: 'var(--surface-elevated)',
        color: 'var(--text-secondary)',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
      }}
    >
      <TypeIcon className="w-3 h-3" /> {type}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.32em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function summarizeElement(el: HTMLElement): string {
  if (el.tagName === 'IMG') return (el as HTMLImageElement).alt || 'Image';
  const text = (el.textContent || '').trim();
  if (text) return text.length > 38 ? text.slice(0, 38) + '…' : text;
  return el.tagName.toLowerCase();
}

function rgbToHex(rgb: string): string {
  if (!rgb || !rgb.startsWith('rgb')) return '';
  const m = rgb.match(/\d+/g);
  if (!m || m.length < 3) return '';
  const [r, g, b] = m.slice(0, 3).map(Number);
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

const numberStyle: React.CSSProperties = {
  height: 28,
  padding: '0 8px',
  border: '1px solid var(--border)',
  borderRadius: 6,
  background: 'var(--surface-elevated)',
  color: 'var(--text-primary)',
  fontSize: 12,
  width: '100%',
  outline: 'none',
};

const selectStyle: React.CSSProperties = {
  ...numberStyle,
  appearance: 'none',
  cursor: 'pointer',
};

const ghostBtnStyle: React.CSSProperties = {
  width: '100%',
  height: 32,
  padding: '0 12px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  borderRadius: 6,
  border: '1px solid var(--border)',
  background: 'var(--surface-elevated)',
  color: 'var(--text-primary)',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
};

function chipStyle(active: boolean): React.CSSProperties {
  return {
    minWidth: 38,
    height: 26,
    padding: '0 8px',
    border: active ? '1px solid var(--accent, #001563)' : '1px solid var(--border)',
    background: active ? 'var(--accent, #001563)' : 'var(--surface-elevated)',
    color: active ? '#fff' : 'var(--text-primary)',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
  };
}

function iconBtnStyle(active: boolean): React.CSSProperties {
  return {
    width: 30,
    height: 28,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: active ? '1px solid var(--accent, #001563)' : '1px solid var(--border)',
    background: active ? 'var(--accent, #001563)' : 'var(--surface-elevated)',
    color: active ? '#fff' : 'var(--text-primary)',
    borderRadius: 6,
    cursor: 'pointer',
  };
}
