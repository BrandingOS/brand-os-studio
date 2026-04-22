/**
 * MainBoard — the right-hand workspace of the tool.
 *
 * No outer card wrapper: we live directly inside the cosmos `.shell`
 * grid so the board inherits the same baseline, padding rhythm, and
 * vertical start as the left `.panel`. This matches the /setup page.
 */
import { useMemo, useState } from 'react';
import { Heart, Grid3x3, Info, Download, PencilLine } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { hexToOklch, type PaletteSystem, type RoleKey, type ShadeStop } from '@/lib/color-engine';

import { PaletteStrip } from './PaletteStrip';
import { ShadeDetailDrawer } from './ShadeDetailDrawer';
import { ContrastGrid } from './ContrastGrid';
import { ExportPanel } from './ExportPanel';
import { ShareDialog } from './ShareDialog';
import { SavedPalettesDrawer } from './SavedPalettesDrawer';
import { SHOWCASES, type ShowcaseKey } from './showcases';
import { deriveLogoLetter, type BrandIdentity } from './showcases/showcase-shared';
import type { PaletteStateSnapshot, PaletteActions } from '../hooks/usePaletteState';

export interface MainBoardProps {
  state: PaletteStateSnapshot & PaletteActions;
  canExportAdvanced: boolean;
  apcaAvailable: boolean;
  canSave: boolean;
  paletteName: string;
  onPaletteNameChange?: (next: string) => void;
  brandName: string;
  logoUrl?: string | null;
}

export function MainBoard({
  state,
  canExportAdvanced,
  apcaAvailable,
  canSave,
  paletteName,
  onPaletteNameChange,
  brandName,
  logoUrl,
}: MainBoardProps) {
  const brand: BrandIdentity = {
    name: brandName.trim() || 'Brandos',
    letter: deriveLogoLetter(brandName),
    logoUrl: logoUrl ?? null,
  };
  const [activeShowcase, setActiveShowcase] = useState<ShowcaseKey>('bento');
  const [shareOpen, setShareOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [contrastOpen, setContrastOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [drawer, setDrawer] = useState<{
    open: boolean;
    role: RoleKey | null;
    stop: ShadeStop | null;
    previousHex: string | null;
  }>({ open: false, role: null, stop: null, previousHex: null });

  const activeRole = drawer.role ? state.roles[drawer.role] : null;
  const activeValue =
    activeRole && drawer.stop != null ? activeRole.shades[drawer.stop] : null;

  const openDrawer = (role: RoleKey, stop: ShadeStop) => {
    const scale = state.roles[role];
    if (!scale) return;
    setDrawer({ open: true, role, stop, previousHex: scale.shades[stop].hex });
  };

  const ActiveShowcase = useMemo(
    () => SHOWCASES.find((s) => s.key === activeShowcase)!.Component,
    [activeShowcase],
  );

  return (
    <div className="color-board">
      {/* Top bar: palette name + actions */}
      <div className="color-board-head">
        <input
          type="text"
          value={paletteName}
          spellCheck={false}
          onChange={(e) => onPaletteNameChange?.(e.target.value)}
          className="color-board-title"
          aria-label="Palette name"
        />
        <div className="color-board-actions">
          <ActionLink icon={<Grid3x3 className="h-3.5 w-3.5" />} label="Contrast grid" onClick={() => setContrastOpen(true)} />
          <ActionLink icon={<Info className="h-3.5 w-3.5" />} label="Color info" onClick={() => setInfoOpen(true)} />
          <ActionLink icon={<Download className="h-3.5 w-3.5" />} label="Export" onClick={() => setExportOpen(true)} />
          <ActionLink icon={<PencilLine className="h-3.5 w-3.5" />} label="Edit" onClick={() => setSavedOpen(true)} />
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="color-board-save"
          >
            <Heart className="h-3.5 w-3.5" />
            Save
          </button>
        </div>
      </div>

      {/* Palette strips */}
      <div className="flex flex-col gap-6">
        <PaletteStrip
          label={paletteName.split(/\s|·/)[0] || 'Palette'}
          roleLabel="Primary"
          scale={state.roles.primary}
          accentStop={findAccentStop(state.roles.primary.inputHex, state.roles.primary)}
          onShadeClick={(stop) => openDrawer('primary', stop)}
        />
        {state.roles.secondary && (
          <PaletteStrip
            label="Secondary"
            roleLabel="Secondary"
            scale={state.roles.secondary}
            accentStop={findAccentStop(
              state.roles.secondary.inputHex,
              state.roles.secondary,
            )}
            onShadeClick={(stop) => openDrawer('secondary', stop)}
          />
        )}
      </div>

      {/* Showcase tab strip */}
      <div className="color-board-tabs">
        {SHOWCASES.map((sc) => (
          <button
            key={sc.key}
            type="button"
            onClick={() => setActiveShowcase(sc.key)}
            className={cn(
              'color-board-tab',
              activeShowcase === sc.key && 'is-active',
            )}
          >
            {sc.label}
          </button>
        ))}
      </div>

      {/* Showcase body */}
      <div className="color-board-body">
        <ActiveShowcase palette={state} secondary={state.roles.secondary} brand={brand} />
      </div>

      {/* Dialogs */}
      <ShadeDetailDrawer
        open={drawer.open}
        onOpenChange={(o) => setDrawer((d) => ({ ...d, open: o }))}
        stop={drawer.stop}
        value={activeValue}
        previousValue={
          drawer.previousHex != null && activeValue
            ? { ...activeValue, hex: drawer.previousHex }
            : null
        }
        onEdit={(hex) => drawer.role && drawer.stop != null && state.editShade(drawer.role, drawer.stop, hex)}
        onReset={() => drawer.role && drawer.stop != null && state.resetShade(drawer.role, drawer.stop)}
        onToggleLock={() => {
          if (!drawer.role || drawer.stop == null) return;
          const current = state.roles[drawer.role]?.shades[drawer.stop];
          if (!current) return;
          state.lockShade(drawer.role, drawer.stop, !current.locked);
        }}
      />

      <Dialog open={contrastOpen} onOpenChange={setContrastOpen}>
        <DialogContent className="max-h-[80vh] max-w-5xl overflow-auto">
          <DialogHeader>
            <DialogTitle>Contrast grid</DialogTitle>
          </DialogHeader>
          <ContrastGrid
            palette={state}
            standard={state.settings.contrastStandard}
            onStandardChange={(std) => state.setSetting('contrastStandard', std)}
            apcaAvailable={apcaAvailable}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-h-[80vh] max-w-4xl overflow-auto">
          <DialogHeader>
            <DialogTitle>Export palette</DialogTitle>
          </DialogHeader>
          <ExportPanel palette={state} canExportAdvanced={canExportAdvanced} />
        </DialogContent>
      </Dialog>

      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Palette details</DialogTitle>
          </DialogHeader>
          <ColorInfo state={state} />
        </DialogContent>
      </Dialog>

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        palette={state as PaletteSystem}
        theme={state.theme}
        canSave={canSave}
      />

      <SavedPalettesDrawer
        open={savedOpen}
        onOpenChange={setSavedOpen}
        onLoad={(p) => {
          state.replace(p);
          setSavedOpen(false);
        }}
      />
    </div>
  );
}

function ActionLink({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="color-action-link">
      {icon}
      {label}
    </button>
  );
}

function findAccentStop(
  seedHex: string,
  scale: { shades: Record<ShadeStop, { hex: string }> },
): ShadeStop {
  const stops: ShadeStop[] = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  const seed = hexToOklch(seedHex);
  let nearest: ShadeStop = 500;
  let bestDist = Infinity;
  for (const stop of stops) {
    const shadeHex = scale.shades[stop].hex;
    if (shadeHex.toLowerCase() === seedHex.toLowerCase()) return stop;
    const { l, c, h } = hexToOklch(shadeHex);
    const dh = ((h - seed.h + 540) % 360) - 180;
    const dl = l - seed.l;
    const dc = c - seed.c;
    // Perceptual OKLCH distance — lightness and chroma weigh most, hue
    // is down-weighted so near-grey shades don't dominate the match.
    const dist = dl * dl + dc * dc + (dh * dh) / 6000;
    if (dist < bestDist) {
      bestDist = dist;
      nearest = stop;
    }
  }
  return nearest;
}

function ColorInfo({ state }: { state: PaletteStateSnapshot & PaletteActions }) {
  const p = state.roles.primary;
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-lg border" style={{ background: p.inputHex }} />
        <div>
          <p className="text-xs text-muted-foreground">Primary seed</p>
          <p className="font-mono font-semibold">{p.inputHex.toUpperCase()}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <InfoRow label="RGB" value={`${p.shades[500].rgb.r}, ${p.shades[500].rgb.g}, ${p.shades[500].rgb.b}`} />
        <InfoRow label="HSL" value={`${Math.round(p.shades[500].hsl.h)}°, ${Math.round(p.shades[500].hsl.s * 100)}%, ${Math.round(p.shades[500].hsl.l * 100)}%`} />
        <InfoRow
          label="OKLCH"
          value={`${p.shades[500].oklch.l.toFixed(3)} ${p.shades[500].oklch.c.toFixed(3)} ${p.shades[500].oklch.h.toFixed(0)}`}
        />
        <InfoRow label="Mode" value={state.settings.generationMode} />
        <InfoRow label="Locked stop" value={state.settings.lockedShade == null ? 'auto' : String(state.settings.lockedShade)} />
        <InfoRow label="Contrast standard" value={state.settings.contrastStandard} />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col rounded-md border bg-muted/30 p-2">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="font-mono text-xs">{value}</span>
    </div>
  );
}
