/**
 * EditorPanel — the left-hand control panel of the tool.
 *
 * Three categories: Brand (colors + harmony), Fonts (Google Font pair
 * preview), Logo (upload a brand logo). All controls use cosmos tokens
 * — borders, surfaces, shadows, typography — so the panel matches the
 * /setup workspace exactly.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Dice5, Lock, LockOpen, Settings2, Trash2, Upload, Check, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  ALL_HARMONIES,
  HARMONY_DESCRIPTORS,
  SHADE_STOPS,
  generateHarmony,
  isValidHex,
  normalizeHex,
  type HarmonyName,
  type ShadeStop,
  type GenerationMode,
} from '@/lib/color-engine';
import { ColorPickerHSV } from '@/features/setup/components/ColorPickerHSV';
import { FONT_PAIRS, type FontPair } from '../data/font-pairs';
import { loadGoogleFontPair } from '../hooks/useGoogleFonts';

export interface EditorPanelProps {
  headingLabel?: string;
  brandName: string;
  onBrandNameChange: (next: string) => void;
  primaryHex: string;
  primaryLocked: boolean;
  secondaryHex: string | null;
  secondaryLocked: boolean;
  lockedShade: ShadeStop | null;
  harmony: HarmonyName | 'auto';
  generationMode: GenerationMode;
  fontPairId: string;
  onFontPairChange: (pair: FontPair) => void;
  logoUrl: string | null;
  onLogoChange: (url: string | null) => void;
  onPrimaryChange: (hex: string) => void;
  onSecondaryChange: (hex: string) => void;
  onAddSecondary: () => void;
  onRemoveSecondary: () => void;
  onRandomize: () => void;
  onHarmonyChange: (h: HarmonyName | 'auto') => void;
  onLockedShadeChange: (s: ShadeStop | null) => void;
  onModeChange: (m: GenerationMode) => void;
}

type CategoryKey = 'brand' | 'fonts' | 'logo';

const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: 'brand', label: 'Brand' },
  { key: 'fonts', label: 'Fonts' },
  { key: 'logo', label: 'Logo' },
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
  fontPairId,
  onFontPairChange,
  logoUrl,
  onLogoChange,
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
          <span className="panel-heading-eyebrow">Brand System</span>
          <h1 className="panel-heading-title">
            {headingLabel ? headingLabel : 'Build the system'}
          </h1>
        </div>
        <p style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--text-muted)' }}>
          Colors, type, and logo — see the whole brand come together across
          every surface.
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
              className={cn('editor-cat', category === c.key && 'is-active')}
            >
              {c.label}
            </button>
          ))}
        </div>

        {category === 'brand' && (
          <>
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
                      onLockedShadeChange(
                        e.target.value === 'none' ? null : (Number(e.target.value) as ShadeStop),
                      )
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
                Add secondary color
              </button>
            )}

            <button type="button" onClick={onRandomize} className="editor-ghost">
              <Dice5 size={14} />
              Random colors
              <span className="editor-key-hint">Spacebar</span>
            </button>

            <HarmonyPicker
              primaryHex={primaryHex}
              value={harmony}
              onChange={onHarmonyChange}
            />
          </>
        )}

        {category === 'fonts' && (
          <FontsPanel activeId={fontPairId} onChange={onFontPairChange} />
        )}

        {category === 'logo' && (
          <LogoPanel logoUrl={logoUrl} onChange={onLogoChange} brandName={brandName} />
        )}
      </div>
    </aside>
  );
}

// ─── Harmony picker (visual chips) ────────────────────────────

function HarmonyPicker({
  primaryHex,
  value,
  onChange,
}: {
  primaryHex: string;
  value: HarmonyName | 'auto';
  onChange: (h: HarmonyName | 'auto') => void;
}) {
  const options = useMemo(() => {
    return ALL_HARMONIES.map((name) => {
      try {
        const { seeds } = generateHarmony(primaryHex, name);
        return { name, seeds };
      } catch {
        return { name, seeds: [primaryHex] as string[] };
      }
    });
  }, [primaryHex]);

  const labelFor = (name: HarmonyName): string => {
    switch (name) {
      case 'monochromatic':
        return 'Mono';
      case 'analogous':
        return 'Neighbour';
      case 'complementary':
        return 'Opposite';
      case 'split-complementary':
        return 'Split';
      case 'triadic':
        return 'Triad';
      case 'tetradic':
        return 'Quad';
    }
  };

  const shortHint = (name: HarmonyName): string => {
    switch (name) {
      case 'monochromatic':
        return 'One hue, many shades.';
      case 'analogous':
        return 'Close neighbours — cohesive.';
      case 'complementary':
        return 'Direct opposite — high contrast.';
      case 'split-complementary':
        return 'Pop without clash.';
      case 'triadic':
        return 'Three evenly spaced hues.';
      case 'tetradic':
        return 'Four-way palette.';
    }
  };

  return (
    <div className="editor-harmony">
      <div className="editor-field-head">
        <span className="editor-field-label">Harmony</span>
        <button
          type="button"
          onClick={() => onChange('auto')}
          className={cn('editor-field-meta-btn', value === 'auto' && 'is-open')}
          aria-label="Reset harmony"
        >
          <span style={{ fontSize: 10, fontWeight: 600 }}>AUTO</span>
        </button>
      </div>
      <div className="harmony-grid">
        {options.map(({ name, seeds }) => {
          const active = value === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => onChange(name)}
              className={cn('harmony-chip', active && 'is-active')}
            >
              <div className="harmony-chip-swatches">
                {(seeds.length > 1 ? seeds : [seeds[0], seeds[0]]).map((hex, i) => (
                  <span key={`${hex}-${i}`} style={{ background: hex }} />
                ))}
              </div>
              <div>
                <div className="harmony-chip-label">{labelFor(name)}</div>
                <div className="harmony-chip-hint">{shortHint(name)}</div>
              </div>
            </button>
          );
        })}
      </div>
      {value !== 'auto' && (
        <p className="editor-harmony-hint">
          {HARMONY_DESCRIPTORS[value as HarmonyName]}
        </p>
      )}
    </div>
  );
}

// ─── Fonts panel ─────────────────────────────────────────────

function FontsPanel({
  activeId,
  onChange,
}: {
  activeId: string;
  onChange: (pair: FontPair) => void;
}) {
  return (
    <div className="font-pair-list">
      {FONT_PAIRS.map((pair) => {
        const active = activeId === pair.id;
        return (
          <button
            key={pair.id}
            type="button"
            className={cn('font-pair', active && 'is-active')}
            onClick={() => {
              loadGoogleFontPair(pair);
              onChange(pair);
            }}
          >
            <div className="font-pair-head">
              <span>{pair.label}</span>
              {active && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Check size={10} />
                  Active
                </span>
              )}
            </div>
            <div className="font-pair-display" style={{ fontFamily: pair.displayStack }}>
              {pair.previewDisplay}
            </div>
            <div className="font-pair-body" style={{ fontFamily: pair.bodyStack }}>
              {pair.previewBody}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Logo panel ─────────────────────────────────────────────

function LogoPanel({
  logoUrl,
  onChange,
  brandName,
}: {
  logoUrl: string | null;
  onChange: (url: string | null) => void;
  brandName: string;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image (PNG, SVG, JPG).');
      return;
    }
    if (file.size > 1_500_000) {
      setError('File is too large — keep it under 1.5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') onChange(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!logoUrl ? (
        <label
          className="logo-drop"
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          onDragOver={(e) => e.preventDefault()}
        >
          <Upload size={18} />
          <strong style={{ fontSize: 12, color: 'var(--text-primary)' }}>
            Upload your logo
          </strong>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            PNG, SVG, or JPG · up to 1.5 MB
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>
      ) : (
        <div className="logo-preview">
          <div className="logo-preview-thumb">
            <img src={logoUrl} alt="Brand logo preview" />
          </div>
          <div className="logo-preview-meta">
            <strong>{brandName || 'Logo uploaded'}</strong>
            <span style={{ fontSize: 11 }}>Shown across every showcase</span>
          </div>
          <button
            type="button"
            className="logo-preview-remove"
            onClick={() => onChange(null)}
            aria-label="Remove logo"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {error && (
        <p style={{ fontSize: 11, color: 'var(--destructive, #b91c1c)', margin: 0 }}>{error}</p>
      )}

      <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
        Upload a transparent PNG or SVG for best results. No logo? Showcases
        fall back to your brand's first letter.
      </p>
    </div>
  );
}

// ─── Color input with inline HSV picker ──────────────────────

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
