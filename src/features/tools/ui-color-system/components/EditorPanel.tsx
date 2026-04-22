/**
 * EditorPanel — the left-hand control panel of the tool.
 *
 * Uses cosmos CSS tokens throughout (see color-system.css) so the form
 * matches the /setup page aesthetic exactly. Every control — tabs,
 * color input, pills, select — is scoped under
 * [data-cosmos="workspace"] and inherits the same border, surface,
 * shadow, and spacing rhythm as the rest of the cosmos UI.
 */
import { useEffect, useRef, useState } from 'react';
import { Dice5, Lock, LockOpen, Settings2, Trash2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  ALL_HARMONIES,
  HARMONY_DESCRIPTORS,
  SHADE_STOPS,
  isValidHex,
  normalizeHex,
  type HarmonyName,
  type ShadeStop,
  type GenerationMode,
} from '@/lib/color-engine';
import { ColorPickerHSV } from '@/features/setup/components/ColorPickerHSV';

export interface EditorPanelProps {
  /** Shown as the panel title (cosmos heading). Defaults to generator name. */
  headingLabel?: string;
  /** Brand name used inside every showcase — driving logo letter and nav label. */
  brandName: string;
  onBrandNameChange: (next: string) => void;
  primaryHex: string;
  primaryLocked: boolean;
  secondaryHex: string | null;
  secondaryLocked: boolean;
  lockedShade: ShadeStop | null;
  harmony: HarmonyName | 'auto';
  generationMode: GenerationMode;
  onPrimaryChange: (hex: string) => void;
  onSecondaryChange: (hex: string) => void;
  onAddSecondary: () => void;
  onRemoveSecondary: () => void;
  onRandomize: () => void;
  onHarmonyChange: (h: HarmonyName | 'auto') => void;
  onLockedShadeChange: (s: ShadeStop | null) => void;
  onModeChange: (m: GenerationMode) => void;
}

type CategoryKey = 'brand' | 'neutral' | 'status' | 'fonts';

const CATEGORIES: { key: CategoryKey; label: string; disabled?: boolean }[] = [
  { key: 'brand', label: 'Brand' },
  { key: 'neutral', label: 'Neutral', disabled: true },
  { key: 'status', label: 'Status', disabled: true },
  { key: 'fonts', label: 'Fonts', disabled: true },
];

export function EditorPanel({
  headingLabel,
  brandName,
  onBrandNameChange,
  primaryHex,
  primaryLocked,
  secondaryHex,
  secondaryLocked,
  lockedShade,
  harmony,
  generationMode,
  onPrimaryChange,
  onSecondaryChange,
  onAddSecondary,
  onRemoveSecondary,
  onRandomize,
  onHarmonyChange,
  onLockedShadeChange,
  onModeChange,
}: EditorPanelProps) {
  const [category, setCategory] = useState<CategoryKey>('brand');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const panelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!settingsOpen) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [settingsOpen]);

  return (
    <aside className="panel" aria-label="Color system editor" ref={panelRef}>
      <div className="panel-top">
        <div className="panel-heading">
          <span className="panel-heading-eyebrow">UI Color System</span>
          <h1 className="panel-heading-title">
            {headingLabel ? headingLabel : 'Tailwind CSS Color Generator'}
          </h1>
        </div>
        <p style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--text-muted)' }}>
          Create and visualize a full UI color system on all sorts of components
          and designs.
        </p>
      </div>

      <div className="editor-panel">
        <div className="editor-identity">
          <label className="editor-identity-label" htmlFor="brand-name-input">
            Brand name
          </label>
          <input
            id="brand-name-input"
            type="text"
            value={brandName}
            onChange={(e) => onBrandNameChange(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            placeholder="e.g. Acme"
            className="editor-identity-input"
            aria-label="Brand name"
          />
        </div>

        <div className="editor-cats">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              disabled={c.disabled}
              className={cn('editor-cat', category === c.key && 'is-active')}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div>
          <div className="editor-field-head">
            <span className="editor-field-label">Primary</span>
            <div className="editor-field-meta">
              <span>HEX</span>
              <button
                type="button"
                onClick={() => setSettingsOpen((s) => !s)}
                className={cn('editor-field-meta-btn', settingsOpen && 'is-open')}
                aria-label="Color settings"
              >
                <Settings2 size={13} />
              </button>
            </div>
          </div>
          <ColorInput
            hex={primaryHex}
            locked={primaryLocked}
            onChange={onPrimaryChange}
            onToggleLock={() => {
              if (primaryLocked) onLockedShadeChange(null);
              else onLockedShadeChange(500);
            }}
          />
        </div>

        {settingsOpen && (
          <div className="editor-settings">
            <label>
              <span>Lock seed at stop</span>
              <select
                className="editor-select"
                value={lockedShade == null ? 'none' : String(lockedShade)}
                onChange={(e) =>
                  onLockedShadeChange(e.target.value === 'none' ? null : (Number(e.target.value) as ShadeStop))
                }
              >
                <option value="none">Auto</option>
                {SHADE_STOPS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Generation mode</span>
              <select
                className="editor-select"
                value={generationMode}
                onChange={(e) => onModeChange(e.target.value as GenerationMode)}
              >
                <option value="auto">Auto</option>
                <option value="brand-safe">Brand-safe</option>
                <option value="high-contrast">High contrast</option>
                <option value="soft-ui">Soft UI</option>
                <option value="vibrant-saas">Vibrant SaaS</option>
                <option value="neutral-enterprise">Enterprise</option>
                <option value="dark-mode-optimized">Dark-first</option>
              </select>
            </label>
          </div>
        )}

        {secondaryHex != null ? (
          <div>
            <div className="editor-field-head">
              <span className="editor-field-label">Secondary</span>
              <div className="editor-field-meta">
                <span>HEX</span>
                <button
                  type="button"
                  onClick={onRemoveSecondary}
                  className="editor-field-meta-btn is-destructive"
                  aria-label="Remove secondary"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
            <ColorInput
              hex={secondaryHex}
              locked={secondaryLocked}
              onChange={onSecondaryChange}
              onToggleLock={() => {
                /* individual locking handled per-shade */
              }}
            />
          </div>
        ) : (
          <button type="button" onClick={onAddSecondary} className="editor-cta">
            <span style={{ fontSize: 16, lineHeight: 1, marginTop: -2 }}>+</span>
            Add secondary color scale
          </button>
        )}

        <button type="button" onClick={onRandomize} className="editor-ghost">
          <Dice5 size={14} />
          Random colors
          <span className="editor-key-hint">Spacebar</span>
        </button>

        <div className="editor-harmony">
          <label className="editor-harmony-label" htmlFor="harmony-select">
            Color harmony
          </label>
          <select
            id="harmony-select"
            className="editor-select editor-select-lg"
            value={harmony}
            onChange={(e) => onHarmonyChange(e.target.value as HarmonyName | 'auto')}
          >
            <option value="auto">Auto</option>
            {ALL_HARMONIES.map((h) => (
              <option key={h} value={h}>
                {h.replace('-', ' ')}
              </option>
            ))}
          </select>
          {harmony !== 'auto' && (
            <p className="editor-harmony-hint">
              {HARMONY_DESCRIPTORS[harmony as HarmonyName]}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}

function ColorInput({
  hex,
  locked,
  onChange,
  onToggleLock,
}: {
  hex: string;
  locked: boolean;
  onChange: (hex: string) => void;
  onToggleLock: () => void;
}) {
  const [text, setText] = useState(hex);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setText(hex), [hex]);

  const commit = (v: string) => {
    setText(v);
    const withHash = v.startsWith('#') ? v : `#${v}`;
    if (isValidHex(withHash)) onChange(normalizeHex(withHash));
  };

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setPreview(null);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const swatchHex = preview ?? hex;

  return (
    <div ref={wrapRef}>
      <div className="editor-color-input">
        <button
          type="button"
          className="editor-color-chip"
          style={{ background: swatchHex }}
          onClick={() => setOpen((o) => !o)}
          aria-label="Open color picker"
          aria-expanded={open}
        />
        <input
          type="text"
          value={text}
          onChange={(e) => commit(e.target.value)}
          spellCheck={false}
          autoComplete="off"
          className="editor-color-hex"
          aria-label="Hex value"
        />
        <button
          type="button"
          onClick={onToggleLock}
          className={cn('editor-color-lock', locked && 'is-active')}
          aria-label={locked ? 'Unlock' : 'Lock'}
        >
          {locked ? <Lock size={13} /> : <LockOpen size={13} />}
        </button>
      </div>
      <div className={cn('cp-expand', open && 'is-open')} aria-hidden={!open}>
        {open && (
          <ColorPickerHSV
            key={hex}
            hex={hex}
            onChange={(next) => setPreview(next)}
            onCommit={(next) => {
              commit(next);
              setOpen(false);
              setPreview(null);
            }}
            onCancel={() => {
              setOpen(false);
              setPreview(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
