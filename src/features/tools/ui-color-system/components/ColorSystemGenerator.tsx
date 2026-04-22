/**
 * ColorSystemGenerator — the canonical root for UI Color System.
 *
 * One component, two shells. The public page wraps this in a marketing
 * chrome; the in-app page wraps it in the dashboard layout. All
 * mode/plan branching goes through `useToolContext`.
 *
 * Layout on desktop (≥lg):
 *   ┌──────────────────── SeedInputBar ─────────────────────┐
 *   │  Primary                                              │
 *   │  Neutral                                              │
 *   │  Secondary · Tertiary · Success · Warning · Error     │
 *   │  ─────                                                 │
 *   │  Tabs: Preview · Contrast · Export · Harmony          │
 *   └───────────────────────────────────────────────────────┘
 *
 * On mobile (<lg): everything stacks; tabs stay pinned.
 */
import { useCallback, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import { Plus, Sparkles, Sun, Moon, Save, Share2, FolderOpen } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  hslToHex,
  type HarmonyName,
  type RoleKey,
  type ShadeStop,
} from '@/lib/color-engine';

import {
  usePaletteStore,
  type PaletteStore,
} from '../hooks/usePaletteState';
import { useToolContext } from '../hooks/useToolContext';
import { SeedInputBar } from './SeedInputBar';
import { RoleRow } from './RoleRow';
import { ShadeDetailDrawer } from './ShadeDetailDrawer';
import { PalettePreview } from './PalettePreview';
import { ContrastGrid } from './ContrastGrid';
import { ExportPanel } from './ExportPanel';
import { HarmonyPanel } from './HarmonyPanel';
import { ProLock } from './ProLock';
import { BrandSyncBar } from './BrandSyncBar';
import { ShareDialog } from './ShareDialog';
import { SavedPalettesDrawer } from './SavedPalettesDrawer';
import { useSavedPalettes } from '../hooks/useSavedPalettes';
import { useHotkeys } from '../hooks/useHotkeys';
import { usePaletteHistory } from '../hooks/usePaletteHistory';

export interface BrandIntegration {
  brandName: string;
  brandPrimary?: string;
  /** Called with the CURRENT palette when the user clicks Save-to-brand. */
  onPush: (palette: import('@/lib/color-engine').PaletteSystem) => void | Promise<void>;
}

export interface ColorSystemGeneratorProps {
  /** Initial seed color (hex). Defaults to a BrandingOS-friendly blue. */
  initialSeed?: string;
  /** Pre-baked palette (public share link, brand import, claim flow). */
  initialPalette?: unknown; // Typed loosely; the shell decides the shape.
  /** Override mode — useful when embedding inside a brand page. */
  forcedMode?: 'standalone' | 'integrated';
  /** Render slot above the main grid (custom banners, etc.). */
  headerSlot?: React.ReactNode;
  /** Brand integration — renders the BrandSyncBar above the main grid. */
  brand?: BrandIntegration;
}

const ROLE_LABELS: Record<RoleKey, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  tertiary: 'Tertiary',
  neutral: 'Neutral',
  success: 'Success',
  warning: 'Warning',
  error: 'Error',
  info: 'Info',
};

export function ColorSystemGenerator({
  initialSeed = '#0ea5e9',
  forcedMode,
  headerSlot,
  brand,
}: ColorSystemGeneratorProps) {
  const ctx = useToolContext(forcedMode);
  const store = usePaletteStore(initialSeed);
  const state = useStore(store);
  const { save, palettes } = useSavedPalettes();

  const [shareOpen, setShareOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'contrast' | 'harmony' | 'export'>('preview');

  const history = usePaletteHistory(state, (restored) => state.replace(restored));

  useHotkeys({
    r: () => state.setSeed(randomHex()),
    c: () => setActiveTab('contrast'),
    e: () => setActiveTab('export'),
    h: () => setActiveTab('harmony'),
    p: () => setActiveTab('preview'),
    l: () => {
      const nextStop = state.settings.lockedShade == null ? 500 : null;
      state.setSetting('lockedShade', nextStop);
    },
    s: () => setShareOpen(true),
    '/': () => setShareOpen(false),
    z: (e) => {
      if (e.shiftKey) history.redo();
      else history.undo();
    },
  });

  const [drawer, setDrawer] = useState<{
    open: boolean;
    role: RoleKey | null;
    stop: ShadeStop | null;
    previousHex: string | null;
  }>({ open: false, role: null, stop: null, previousHex: null });

  const openDrawer = useCallback(
    (role: RoleKey, stop: ShadeStop) => {
      const scale = state.roles[role];
      if (!scale) return;
      setDrawer({
        open: true,
        role,
        stop,
        previousHex: scale.shades[stop].hex,
      });
    },
    [state.roles],
  );

  const handleShadeEdit = (hex: string) => {
    if (!drawer.role || drawer.stop == null) return;
    state.editShade(drawer.role, drawer.stop, hex);
  };

  const handleShadeReset = () => {
    if (!drawer.role || drawer.stop == null) return;
    state.resetShade(drawer.role, drawer.stop);
  };

  const handleShadeLockToggle = () => {
    if (!drawer.role || drawer.stop == null) return;
    const role = state.roles[drawer.role];
    if (!role) return;
    const current = role.shades[drawer.stop];
    state.lockShade(drawer.role, drawer.stop, !current.locked);
  };

  const activeRole = drawer.role ? state.roles[drawer.role] : null;
  const activeValue =
    activeRole && drawer.stop != null ? activeRole.shades[drawer.stop] : null;

  const randomize = () => state.setSeed(randomHex());

  const visibleRoles = useMemo<RoleKey[]>(() => {
    const rs: RoleKey[] = ['primary', 'neutral'];
    if (state.roles.secondary) rs.push('secondary');
    if (state.roles.tertiary) rs.push('tertiary');
    if (state.roles.success) rs.push('success');
    if (state.roles.warning) rs.push('warning');
    if (state.roles.error) rs.push('error');
    if (state.roles.info) rs.push('info');
    return rs;
  }, [state.roles]);

  return (
    <div
      className={cn(
        'flex min-h-[calc(100vh-3.5rem)] flex-col gap-4 bg-background p-4 md:p-6',
        state.theme === 'dark' && 'dark bg-zinc-950',
      )}
      data-tool="ui-color-system"
    >
      {headerSlot}

      {brand && (
        <BrandSyncBar
          brandName={brand.brandName}
          brandPrimary={brand.brandPrimary}
          palette={state}
          onPullFromBrand={() => {
            if (brand.brandPrimary) state.setSeed(brand.brandPrimary);
          }}
          onPushToBrand={() => brand.onPush(state)}
          onSaveAsVariant={() => {
            save(state, `${brand.brandName} · ${state.roles.primary.inputHex}`);
          }}
        />
      )}

      <SeedInputBar
        seed={state.seedColor}
        onSeedChange={state.setSeed}
        mode={state.settings.generationMode}
        onModeChange={(m) => state.setSetting('generationMode', m)}
        lockedShade={state.settings.lockedShade}
        onLockedShadeChange={(s) => state.setSetting('lockedShade', s)}
        onRandomize={randomize}
      />

      <div className="flex flex-col gap-3">
        {visibleRoles.map((role) => {
          const scale = state.roles[role];
          if (!scale) return null;
          const gated = isGatedRole(role) && !ctx.perms.canAddSecondary;
          return (
            <RoleRow
              key={role}
              role={role}
              label={ROLE_LABELS[role]}
              scale={scale}
              onSeedChange={(hex) => state.setRoleSeed(role, hex)}
              onShadeEdit={(stop) => openDrawer(role, stop)}
              onShadeLockToggle={(stop) => {
                const current = scale.shades[stop];
                state.lockShade(role, stop, !current.locked);
              }}
              onRemove={
                role === 'primary' || role === 'neutral'
                  ? undefined
                  : () => state.removeRole(role)
              }
              isLocked={gated}
            />
          );
        })}

        <AddRoleBar
          state={state}
          store={store}
          canAddSecondary={ctx.perms.canAddSecondary}
          canAddSemantics={ctx.perms.canAddSemantics}
        />
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="mt-2 flex min-h-[28rem] flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="contrast">Contrast</TabsTrigger>
            <TabsTrigger value="harmony">Harmony</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSavedOpen(true)}
              className="gap-1.5"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              My palettes
              {palettes.length > 0 && (
                <span className="rounded-full bg-muted px-1.5 text-[10px] font-medium">
                  {palettes.length}
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                save(state);
              }}
              className="gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              Save
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShareOpen(true)}
              className="gap-1.5"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => state.setTheme(state.theme === 'light' ? 'dark' : 'light')}
              className="gap-1.5"
              aria-label="Toggle preview theme"
            >
              {state.theme === 'light' ? (
                <Sun className="h-3.5 w-3.5" />
              ) : (
                <Moon className="h-3.5 w-3.5" />
              )}
              {state.theme === 'light' ? 'Light' : 'Dark'}
            </Button>
          </div>
        </div>

        <TabsContent value="preview" className="mt-4 flex-1">
          <PalettePreview palette={state} theme={state.theme} />
        </TabsContent>
        <TabsContent value="contrast" className="mt-4 flex-1">
          <ContrastGrid
            palette={state}
            standard={state.settings.contrastStandard}
            onStandardChange={(std) => state.setSetting('contrastStandard', std)}
            apcaAvailable={ctx.perms.canUseApca}
          />
        </TabsContent>
        <TabsContent value="harmony" className="mt-4 flex-1">
          <HarmonyPanel
            seedHex={state.roles.primary.inputHex}
            onApply={(h: HarmonyName) => state.applyHarmony(h)}
            canApplyMulti={ctx.perms.canUseHarmonyMulti}
          />
        </TabsContent>
        <TabsContent value="export" className="mt-4 flex-1">
          <ExportPanel
            palette={state}
            canExportAdvanced={ctx.perms.canExportAdvanced}
          />
        </TabsContent>
      </Tabs>

      {!ctx.perms.canAddSecondary && (
        <ProLock
          headline="Unlock the full color system"
          body="Secondary and tertiary scales, full semantic roles, APCA, image extraction, and advanced exports."
        />
      )}

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
        onEdit={handleShadeEdit}
        onReset={handleShadeReset}
        onToggleLock={handleShadeLockToggle}
      />

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        palette={state}
        theme={state.theme}
        canSave={ctx.perms.canSave}
        onSave={() => save(state)}
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

function isGatedRole(role: RoleKey): boolean {
  return role === 'secondary' || role === 'tertiary' || role === 'success' || role === 'warning' || role === 'error' || role === 'info';
}

function randomHex(): string {
  const h = Math.floor(Math.random() * 360);
  const s = 70 + Math.floor(Math.random() * 20);
  const l = 50 + Math.floor(Math.random() * 10);
  return hslToHex({ h, s: s / 100, l: l / 100 });
}

function AddRoleBar({
  state,
  canAddSecondary,
  canAddSemantics,
}: {
  state: ReturnType<typeof useStore<PaletteStore>>;
  store: PaletteStore;
  canAddSecondary: boolean;
  canAddSemantics: boolean;
}) {
  const missing: RoleKey[] = [];
  if (!state.roles.secondary && canAddSecondary) missing.push('secondary');
  if (!state.roles.tertiary && canAddSecondary) missing.push('tertiary');
  if (!state.roles.success && canAddSemantics) missing.push('success');
  if (!state.roles.warning && canAddSemantics) missing.push('warning');
  if (!state.roles.error && canAddSemantics) missing.push('error');
  if (!state.roles.info && canAddSemantics) missing.push('info');

  if (missing.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed bg-muted/30 p-3 text-xs">
      <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-muted-foreground">Add a scale:</span>
      {missing.map((role) => (
        <Button
          key={role}
          variant="ghost"
          size="sm"
          className="h-7 gap-1 rounded-full border bg-background text-xs"
          onClick={() => state.addRole(role)}
        >
          <Plus className="h-3 w-3" />
          {ROLE_LABELS[role]}
        </Button>
      ))}
    </div>
  );
}
