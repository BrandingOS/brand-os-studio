/**
 * ColorSystemGenerator — root for the UI Color System tool.
 *
 * Owns the shared, tool-level brand state that sits outside the
 * palette engine: brand name, font pair, and uploaded logo. These are
 * threaded into EditorPanel (controls) and MainBoard (showcases).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';

import { CosmosWorkspaceShell } from '@/shared/layouts/CosmosWorkspaceShell';
import '../color-system.css';
import {
  hslToHex,
  type HarmonyName,
  type PaletteSystem,
  type ShadeStop,
  type GenerationMode,
} from '@/lib/color-engine';

import { usePaletteStore } from '../hooks/usePaletteState';
import { useToolContext } from '../hooks/useToolContext';
import { useHotkeys } from '../hooks/useHotkeys';
import { DEFAULT_FONT_PAIR, type FontPair } from '../data/font-pairs';
import { loadGoogleFontPair } from '../hooks/useGoogleFonts';
import { EditorPanel } from './EditorPanel';
import { MainBoard } from './MainBoard';
import { BrandSyncBar } from './BrandSyncBar';

export interface BrandIntegration {
  brandName: string;
  brandPrimary?: string;
  brandSecondary?: string;
  onPush: (palette: PaletteSystem) => void | Promise<void>;
}

export interface ColorSystemGeneratorProps {
  initialSeed?: string;
  initialSecondary?: string | null;
  forcedMode?: 'standalone' | 'integrated';
  brand?: BrandIntegration;
}

export function ColorSystemGenerator({
  initialSeed = '#0ea5e9',
  initialSecondary = null,
  forcedMode,
  brand,
}: ColorSystemGeneratorProps) {
  const ctx = useToolContext(forcedMode);
  const store = usePaletteStore(initialSeed);
  const state = useStore(store);

  useEffect(() => {
    if (initialSecondary && !state.roles.secondary) {
      state.addRole('secondary');
      state.setRoleSeed('secondary', initialSecondary);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSecondary]);

  const [harmony, setHarmony] = useState<HarmonyName | 'auto'>('auto');
  const [paletteName, setPaletteName] = useState('Palette 1');
  const [brandName, setBrandName] = useState(brand?.brandName ?? 'Brandos');
  const [fontPair, setFontPair] = useState<FontPair>(DEFAULT_FONT_PAIR);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Load any non-default pair's Google Fonts on mount.
  useEffect(() => {
    loadGoogleFontPair(fontPair);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onHarmonyChange = useCallback(
    (h: HarmonyName | 'auto') => {
      setHarmony(h);
      if (h !== 'auto') state.applyHarmony(h);
    },
    [state],
  );

  const randomize = useCallback(() => {
    const h = Math.floor(Math.random() * 360);
    const s = 65 + Math.floor(Math.random() * 25);
    const l = 45 + Math.floor(Math.random() * 15);
    const next = hslToHex({ h, s: s / 100, l: l / 100 });
    state.setSeed(next);
    if (state.roles.secondary) {
      const sH = (h + 140) % 360;
      state.setRoleSeed('secondary', hslToHex({ h: sH, s: s / 100, l: l / 100 }));
    }
  }, [state]);

  useHotkeys({
    ' ': () => randomize(),
    r: () => randomize(),
    z: (e) => {
      if (e.shiftKey) {
        /* redo */
      }
    },
  });

  const primaryLocked = state.settings.lockedShade != null;

  const brandBar = useMemo(() => {
    if (!brand) return null;
    return (
      <BrandSyncBar
        brandName={brand.brandName}
        brandPrimary={brand.brandPrimary}
        palette={state as PaletteSystem}
        onPullFromBrand={() => {
          if (brand.brandPrimary) state.setSeed(brand.brandPrimary);
          if (brand.brandSecondary) {
            if (!state.roles.secondary) state.addRole('secondary');
            state.setRoleSeed('secondary', brand.brandSecondary);
          }
        }}
        onPushToBrand={() => brand.onPush(state as PaletteSystem)}
        onSaveAsVariant={() => {
          setPaletteName(`${brand.brandName} · ${state.roles.primary.inputHex}`);
        }}
      />
    );
  }, [brand, state]);

  // CSS variables for brand typography — read by showcases that opt in
  // via var(--brand-font-display) / var(--brand-font-body).
  const brandFontStyles = {
    ['--brand-font-display' as string]: fontPair.displayStack,
    ['--brand-font-body' as string]: fontPair.bodyStack,
  } as React.CSSProperties;

  return (
    <CosmosWorkspaceShell>
      {brandBar && <div className="px-5 pt-3">{brandBar}</div>}
      <div className="shell" style={brandFontStyles}>
        <EditorPanel
          headingLabel={brand?.brandName}
          brandName={brandName}
          onBrandNameChange={setBrandName}
          primaryHex={state.roles.primary.inputHex}
          primaryLocked={primaryLocked}
          secondaryHex={state.roles.secondary ? state.roles.secondary.inputHex : null}
          secondaryLocked={false}
          lockedShade={state.settings.lockedShade}
          harmony={harmony}
          generationMode={state.settings.generationMode}
          fontPairId={fontPair.id}
          onFontPairChange={setFontPair}
          logoUrl={logoUrl}
          onLogoChange={setLogoUrl}
          onPrimaryChange={(hex) => state.setSeed(hex)}
          onSecondaryChange={(hex) => state.setRoleSeed('secondary', hex)}
          onAddSecondary={() => state.addRole('secondary')}
          onRemoveSecondary={() => state.removeRole('secondary')}
          onRandomize={randomize}
          onHarmonyChange={onHarmonyChange}
          onLockedShadeChange={(s: ShadeStop | null) => state.setSetting('lockedShade', s)}
          onModeChange={(m: GenerationMode) => state.setSetting('generationMode', m)}
        />
        <MainBoard
          state={state}
          canExportAdvanced={ctx.perms.canExportAdvanced}
          apcaAvailable={ctx.perms.canUseApca}
          canSave={ctx.perms.canSave}
          paletteName={paletteName}
          onPaletteNameChange={setPaletteName}
          brandName={brandName}
          logoUrl={logoUrl}
          fontPair={fontPair}
        />
      </div>
    </CosmosWorkspaceShell>
  );
}
