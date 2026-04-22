/**
 * EditorPanel — the left-hand control panel of the tool.
 *
 * Intentionally minimal, like uicolors.app: a title, a category tab row
 * (Brand / Neutral / Status / Fonts), a primary color input, an optional
 * secondary color input, an "Add secondary" CTA, a Randomize button, and
 * a Color harmony setting. Every other surface (contrast grid, export,
 * color info, edit) opens as a dialog triggered from the right board.
 *
 * This component doesn't own state — it reads and mutates via the
 * palette store through props.
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

export interface EditorPanelProps {
  brandName?: string;
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

const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: 'brand', label: 'Brand' },
  { key: 'neutral', label: 'Neutral' },
  { key: 'status', label: 'Status' },
  { key: 'fonts', label: 'Fonts' },
];

export function EditorPanel({
  brandName,
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

  // Close settings popover on outside click.
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
            {brandName ? brandName : 'Tailwind CSS Color Generator'}
          </h1>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Create and visualize a full UI color system on all sorts of components
          and designs.
        </p>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto p-4">
        <div className="flex items-center gap-3 text-sm">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              disabled={c.key !== 'brand'}
              className={cn(
                'relative pb-0.5 text-xs font-medium transition',
                category === c.key
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
                c.key !== 'brand' && 'cursor-not-allowed opacity-50',
              )}
            >
              {c.label}
              {category === c.key && (
                <span className="absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-foreground" />
              )}
            </button>
          ))}
        </div>

        <div className="h-px w-full bg-border" />

        <ColorInput
          label="Primary"
          hex={primaryHex}
          locked={primaryLocked}
          onChange={onPrimaryChange}
          onToggleLock={() => {
            // Lock icon on the color input corresponds to the locked 500 stop.
            if (primaryLocked) onLockedShadeChange(null);
            else onLockedShadeChange(500);
          }}
          rightAction={
            <button
              type="button"
              onClick={() => setSettingsOpen((s) => !s)}
              className={cn(
                'inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground',
                settingsOpen && 'bg-muted text-foreground',
              )}
              aria-label="Color settings"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          }
        />

        {settingsOpen && (
          <div className="-mt-2 flex flex-col gap-2 rounded-lg border bg-muted/30 p-3 text-xs">
            <label className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Lock seed at stop</span>
              <select
                value={lockedShade == null ? 'none' : String(lockedShade)}
                onChange={(e) =>
                  onLockedShadeChange(e.target.value === 'none' ? null : (Number(e.target.value) as ShadeStop))
                }
                className="rounded-md border bg-background px-1.5 py-0.5 text-xs"
              >
                <option value="none">Auto</option>
                {SHADE_STOPS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Generation mode</span>
              <select
                value={generationMode}
                onChange={(e) => onModeChange(e.target.value as GenerationMode)}
                className="rounded-md border bg-background px-1.5 py-0.5 text-xs"
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
          <ColorInput
            label="Secondary"
            hex={secondaryHex}
            locked={secondaryLocked}
            onChange={onSecondaryChange}
            onToggleLock={() => {
              /* Individual role locking is handled per-shade in the drawer. */
            }}
            rightAction={
              <button
                type="button"
                onClick={onRemoveSecondary}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="Remove secondary"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            }
          />
        ) : (
          <button
            type="button"
            onClick={onAddSecondary}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-xs font-semibold text-background transition hover:opacity-90"
          >
            <span className="text-base leading-none">+</span>
            Add secondary color scale
          </button>
        )}

        <button
          type="button"
          onClick={onRandomize}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border bg-card px-4 py-2.5 text-xs font-medium text-foreground transition hover:bg-muted"
        >
          <Dice5 className="h-3.5 w-3.5" />
          Random colors
          <span className="ml-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Spacebar
          </span>
        </button>

        <div className="flex flex-col gap-1 pt-1">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Color harmony
          </label>
          <select
            value={harmony}
            onChange={(e) => onHarmonyChange(e.target.value as HarmonyName | 'auto')}
            className="h-9 rounded-md border bg-background px-2 text-xs"
          >
            <option value="auto">Auto</option>
            {ALL_HARMONIES.map((h) => (
              <option key={h} value={h}>
                {h.replace('-', ' ')}
              </option>
            ))}
          </select>
          {harmony !== 'auto' && (
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              {HARMONY_DESCRIPTORS[harmony as HarmonyName]}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}

function ColorInput({
  label,
  hex,
  locked,
  onChange,
  onToggleLock,
  rightAction,
}: {
  label: string;
  hex: string;
  locked: boolean;
  onChange: (hex: string) => void;
  onToggleLock: () => void;
  rightAction?: React.ReactNode;
}) {
  const [text, setText] = useState(hex);
  useEffect(() => setText(hex), [hex]);

  const commit = (v: string) => {
    setText(v);
    const withHash = v.startsWith('#') ? v : `#${v}`;
    if (isValidHex(withHash)) onChange(normalizeHex(withHash));
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            HEX
          </span>
          {rightAction}
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-2">
        <label
          className="relative inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full ring-1 ring-inset ring-black/10"
          style={{ background: hex }}
        >
          <input
            type="color"
            value={hex}
            onChange={(e) => commit(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label={`${label} color picker`}
          />
        </label>
        <input
          type="text"
          value={text}
          onChange={(e) => commit(e.target.value)}
          spellCheck={false}
          autoComplete="off"
          className="flex-1 bg-transparent text-sm font-mono uppercase tracking-tight text-foreground outline-none"
          aria-label={`${label} hex`}
        />
        <button
          type="button"
          onClick={onToggleLock}
          className={cn(
            'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
            locked
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
          aria-label={locked ? 'Unlock' : 'Lock'}
        >
          {locked ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
        </button>
      </div>
    </div>
  );
}
