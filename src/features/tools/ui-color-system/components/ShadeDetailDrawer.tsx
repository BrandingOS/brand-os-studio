/**
 * ShadeDetailDrawer — inspect and edit a single shade.
 *
 * Shows HEX, RGB, HSL, OKLCH inputs wired bidirectionally. Supports
 * lock, reset, copy, and "compare to previous". Uses the shadcn Sheet
 * on desktop and Drawer (bottom sheet) on mobile.
 */
import { useEffect, useState } from 'react';
import { Copy, Check, RotateCcw, Lock, LockOpen } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  hexToHsl,
  hexToRgb,
  hslToHex,
  rgbToHex,
  hexToOklch,
  oklchToHex,
  isValidHex,
  normalizeHex,
  wcagContrast,
  apcaContrast,
  type ShadeStop,
  type ShadeValue,
} from '@/lib/color-engine';

export interface ShadeDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stop: ShadeStop | null;
  value: ShadeValue | null;
  previousValue: ShadeValue | null;
  onEdit: (hex: string) => void;
  onReset: () => void;
  onToggleLock: () => void;
}

export function ShadeDetailDrawer({
  open,
  onOpenChange,
  stop,
  value,
  previousValue,
  onEdit,
  onReset,
  onToggleLock,
}: ShadeDetailDrawerProps) {
  const [hex, setHex] = useState(value?.hex ?? '');
  useEffect(() => setHex(value?.hex ?? ''), [value?.hex]);

  if (!value || stop == null) return null;

  const rgb = hexToRgb(value.hex);
  const hsl = hexToHsl(value.hex);
  const oklch = hexToOklch(value.hex);

  const commitHex = (raw: string) => {
    setHex(raw);
    if (isValidHex(raw)) onEdit(normalizeHex(raw));
  };

  const ratioOnWhite = wcagContrast(value.hex, '#ffffff');
  const ratioOnBlack = wcagContrast(value.hex, '#000000');
  const lcOnWhite = apcaContrast(value.hex, '#ffffff');
  const lcOnBlack = apcaContrast(value.hex, '#000000');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between gap-3">
            <span>Stop {stop}</span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleLock}
                aria-label={value.locked ? 'Unlock' : 'Lock'}
                className="h-8 w-8"
              >
                {value.locked ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onReset}
                aria-label="Reset"
                className="h-8 w-8"
                disabled={!value.edited}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex flex-col gap-4">
          <div
            className="h-28 w-full rounded-lg border"
            style={{ background: value.hex }}
            aria-hidden
          />

          {previousValue && previousValue.hex !== value.hex && (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-2">
              <span className="text-xs text-muted-foreground">Before</span>
              <div
                className="h-8 flex-1 rounded"
                style={{ background: previousValue.hex }}
              />
              <span className="font-mono text-[11px] uppercase">{previousValue.hex.replace('#', '')}</span>
            </div>
          )}

          <Field label="HEX">
            <div className="flex items-center gap-2">
              <Input
                value={hex}
                onChange={(e) => commitHex(e.target.value)}
                className="h-9 font-mono uppercase"
                spellCheck={false}
                autoComplete="off"
              />
              <CopyButton text={value.hex} />
            </div>
          </Field>

          <Field label="RGB">
            <div className="flex items-center gap-2">
              <NumberInput
                value={rgb.r}
                min={0}
                max={255}
                onChange={(r) => onEdit(rgbToHex({ ...rgb, r }))}
              />
              <NumberInput
                value={rgb.g}
                min={0}
                max={255}
                onChange={(g) => onEdit(rgbToHex({ ...rgb, g }))}
              />
              <NumberInput
                value={rgb.b}
                min={0}
                max={255}
                onChange={(b) => onEdit(rgbToHex({ ...rgb, b }))}
              />
              <CopyButton text={`${rgb.r}, ${rgb.g}, ${rgb.b}`} />
            </div>
          </Field>

          <Field label="HSL">
            <div className="flex items-center gap-2">
              <NumberInput
                value={Math.round(hsl.h)}
                min={0}
                max={360}
                onChange={(h) => onEdit(hslToHex({ ...hsl, h }))}
              />
              <NumberInput
                value={Math.round(hsl.s * 100)}
                min={0}
                max={100}
                onChange={(s) => onEdit(hslToHex({ ...hsl, s: s / 100 }))}
              />
              <NumberInput
                value={Math.round(hsl.l * 100)}
                min={0}
                max={100}
                onChange={(l) => onEdit(hslToHex({ ...hsl, l: l / 100 }))}
              />
              <CopyButton
                text={`${Math.round(hsl.h)}, ${Math.round(hsl.s * 100)}%, ${Math.round(hsl.l * 100)}%`}
              />
            </div>
          </Field>

          <Field label="OKLCH">
            <div className="flex items-center gap-2">
              <NumberInput
                value={Math.round(oklch.l * 100) / 100}
                min={0}
                max={1}
                step={0.01}
                onChange={(l) => onEdit(oklchToHex({ ...oklch, l }))}
              />
              <NumberInput
                value={Math.round(oklch.c * 1000) / 1000}
                min={0}
                max={0.4}
                step={0.001}
                onChange={(c) => onEdit(oklchToHex({ ...oklch, c }))}
              />
              <NumberInput
                value={Math.round(oklch.h)}
                min={0}
                max={360}
                onChange={(h) => onEdit(oklchToHex({ ...oklch, h }))}
              />
              <CopyButton
                text={`oklch(${oklch.l.toFixed(3)} ${oklch.c.toFixed(3)} ${oklch.h.toFixed(1)})`}
              />
            </div>
          </Field>

          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Contrast against pure black & white
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded bg-white p-2 text-black">
                <div className="font-semibold">On white</div>
                <div>WCAG {ratioOnWhite.toFixed(2)}:1</div>
                <div>APCA Lc {lcOnWhite.toFixed(1)}</div>
              </div>
              <div className="rounded bg-black p-2 text-white">
                <div className="font-semibold">On black</div>
                <div>WCAG {ratioOnBlack.toFixed(2)}:1</div>
                <div>APCA Lc {lcOnBlack.toFixed(1)}</div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function NumberInput({
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <Input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const v = Number(e.target.value);
        if (!Number.isFinite(v)) return;
        onChange(v);
      }}
      className="h-9 flex-1 font-mono text-xs"
    />
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handle}
      className="h-9 w-9 shrink-0"
      aria-label={`Copy ${text}`}
    >
      {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}
