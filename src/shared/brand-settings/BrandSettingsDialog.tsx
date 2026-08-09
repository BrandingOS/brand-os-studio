import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Settings,
  Palette,
  Type,
  MessageSquare,
  Target,
  Share2,
  Upload,
  X,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useBrandStore } from '@/shared/store/brandStore';
import { useService, SERVICE_KEYS } from '@/core';
import type { BrandRepository } from '@/domain/brand/repository';
import { changeBrandColors } from '@/application/brand/changeBrandColor';
import { toLegacyBrandPatch } from '@/domain/brand';
import { applyBrandTokens } from '@/shared/design-system/PresentationStyleAdapter';
import { useAssetUpload } from '@/shared/assets/useAssetUpload';
import { resolveBrandLogo } from '@/shared/hooks/useBrandLogo';
import type { BrandSettingsTab } from './BrandSettingsProvider';
import type { Brand } from '@/shared/types/brand';

// ─── Font presets ────────────────────────────────────────────────────────
const FONT_PRESETS = [
  'Inter',
  'Plus Jakarta Sans',
  'DM Sans',
  'Manrope',
  'Outfit',
  'Space Grotesk',
  'Playfair Display',
  'Lora',
  'Fraunces',
  'IBM Plex Sans',
  'Work Sans',
  'Poppins',
];

// ─── Props ───────────────────────────────────────────────────────────────
interface BrandSettingsDialogProps {
  open: boolean;
  activeTab: BrandSettingsTab;
  onTabChange: (tab: BrandSettingsTab) => void;
  onOpenChange: (open: boolean) => void;
}

// ─── Tab config ──────────────────────────────────────────────────────────
const TABS: { value: BrandSettingsTab; label: string; icon: React.ElementType }[] = [
  { value: 'general', label: 'General', icon: Settings },
  { value: 'colors', label: 'Colors', icon: Palette },
  { value: 'typography', label: 'Type', icon: Type },
  { value: 'voice', label: 'Voice', icon: MessageSquare },
  { value: 'strategy', label: 'Strategy', icon: Target },
  { value: 'sharing', label: 'Sharing', icon: Share2 },
];

// ─── Main component ─────────────────────────────────────────────────────
export function BrandSettingsDialog({
  open,
  activeTab,
  onTabChange,
  onOpenChange,
}: BrandSettingsDialogProps) {
  const brand = useBrandStore((s) => s.current);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-[480px] w-full overflow-y-auto"
      >
        <SheetHeader className="mb-6">
          <SheetTitle>{brand?.name ?? 'Brand'} Settings</SheetTitle>
          <SheetDescription>
            Edit brand details, identity, and sharing options.
          </SheetDescription>
        </SheetHeader>

        {brand ? (
          <Tabs
            value={activeTab}
            onValueChange={(v) => onTabChange(v as BrandSettingsTab)}
          >
            <TabsList className="grid w-full grid-cols-6 mb-6">
              {TABS.map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="text-xs gap-1 px-1"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="general">
              <GeneralTab brand={brand} />
            </TabsContent>
            <TabsContent value="colors">
              <ColorsTab brand={brand} />
            </TabsContent>
            <TabsContent value="typography">
              <TypographyTab brand={brand} />
            </TabsContent>
            <TabsContent value="voice">
              <VoiceTab brand={brand} />
            </TabsContent>
            <TabsContent value="strategy">
              <StrategyTab brand={brand} />
            </TabsContent>
            <TabsContent value="sharing">
              <SharingTab brand={brand} />
            </TabsContent>
          </Tabs>
        ) : (
          <p className="text-sm text-muted-foreground">
            No brand selected.
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Shared save button ──────────────────────────────────────────────────
function SaveButton({
  saving,
  onClick,
}: {
  saving: boolean;
  onClick: () => void;
}) {
  return (
    <div className="pt-4">
      <Button onClick={onClick} disabled={saving} className="w-full">
        {saving ? 'Saving...' : 'Save'}
      </Button>
    </div>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────
function Section({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('space-y-4', className)}>{children}</div>;
}

// ─── Field wrapper ───────────────────────────────────────────────────────
function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// GENERAL TAB
// ═════════════════════════════════════════════════════════════════════════
function GeneralTab({ brand }: { brand: Brand }) {
  const updateBrand = useBrandStore((s) => s.update);
  const { upload, removeRole, uploading } = useAssetUpload(brand.id);
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(brand.name);
  const [saving, setSaving] = useState(false);

  const logo = resolveBrandLogo(brand, 'primary');

  const handleLogoSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await upload(file, { role: 'primary', kind: 'logo' });
      // reset input so the same file can be re-selected
      if (fileRef.current) fileRef.current.value = '';
    },
    [upload],
  );

  const handleClearLogo = useCallback(async () => {
    await removeRole('primary');
  }, [removeRole]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await updateBrand(brand.id, { name });
      toast.success('Brand updated');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }, [brand.id, name, updateBrand]);

  return (
    <Section>
      {/* Logo upload */}
      <Field label="Logo">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={cn(
              'relative flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed',
              'transition-colors hover:border-primary/50 hover:bg-muted/50',
              uploading && 'opacity-50 pointer-events-none',
            )}
          >
            {logo?.url ? (
              <img
                src={logo.url}
                alt={brand.name}
                className="h-full w-full rounded-lg object-contain p-1"
              />
            ) : (
              <span className="text-2xl font-bold text-muted-foreground">
                {brand.name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
              <Upload className="h-5 w-5 text-white" />
            </span>
          </button>
          {logo?.url && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearLogo}
              className="text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4 mr-1" />
              Remove
            </Button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoSelect}
          />
        </div>
      </Field>

      {/* Brand name */}
      <Field label="Brand Name" htmlFor="brand-name">
        <Input
          id="brand-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Brand"
        />
      </Field>

      {/* Slug (read-only) */}
      <Field label="Slug">
        <div className="flex items-center rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          {brand.slug}
        </div>
      </Field>

      <SaveButton saving={saving} onClick={handleSave} />
    </Section>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// COLORS TAB
// ═════════════════════════════════════════════════════════════════════════
function ColorsTab({ brand }: { brand: Brand }) {
  // Stage 2D — this dedicated Color editor is migrated onto the canonical stack:
  // read prefers the canonical colorSystem; write goes through changeBrandColors →
  // BrandRepository (one authoritative color write). It replaces the previous
  // scalar-only write, which left colorSystem stale for schema-v3 brands.
  const repo = useService<BrandRepository>(SERVICE_KEYS.BRAND_REPOSITORY);
  const [primary, setPrimary] = useState(
    brand.colorSystem?.primary?.hex ?? brand.primaryColor ?? '#000000',
  );
  const [secondary, setSecondary] = useState(
    brand.colorSystem?.secondary?.hex ?? brand.secondaryColor ?? '',
  );
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const updated = await changeBrandColors(repo, brand.id, {
        primary: { hex: primary },
        ...(secondary ? { secondary: { hex: secondary } } : {}),
      });
      // Reflect the canonical result in the store (both `current` AND `list`,
      // matching brandStore.update) + live theme tokens — without re-persisting.
      const patch = toLegacyBrandPatch(updated);
      useBrandStore.setState((s) => ({
        current: s.current?.id === brand.id ? { ...s.current, ...patch } : s.current,
        list: s.list.map((b) => (b.id === brand.id ? { ...b, ...patch } : b)),
      }));
      const cur = useBrandStore.getState().current;
      if (cur?.id === brand.id) applyBrandTokens(cur);
      toast.success('Colors updated');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }, [brand.id, primary, secondary, repo]);

  return (
    <Section>
      <Field label="Primary Color" htmlFor="color-primary">
        <div className="flex items-center gap-3">
          <input
            type="color"
            id="color-primary"
            value={primary}
            onChange={(e) => setPrimary(e.target.value)}
            className="h-10 w-10 cursor-pointer rounded border-0 p-0"
          />
          <Input
            value={primary}
            onChange={(e) => setPrimary(e.target.value)}
            placeholder="#000000"
            className="flex-1 font-mono text-sm"
          />
        </div>
      </Field>

      <Field label="Secondary Color (optional)" htmlFor="color-secondary">
        <div className="flex items-center gap-3">
          <input
            type="color"
            id="color-secondary"
            value={secondary || '#888888'}
            onChange={(e) => setSecondary(e.target.value)}
            className="h-10 w-10 cursor-pointer rounded border-0 p-0"
          />
          <Input
            value={secondary}
            onChange={(e) => setSecondary(e.target.value)}
            placeholder="#888888"
            className="flex-1 font-mono text-sm"
          />
          {secondary && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSecondary('')}
              className="shrink-0 text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </Field>

      <SaveButton saving={saving} onClick={handleSave} />
    </Section>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// TYPOGRAPHY TAB
// ═════════════════════════════════════════════════════════════════════════
function TypographyTab({ brand }: { brand: Brand }) {
  const updateBrand = useBrandStore((s) => s.update);
  const [primaryFont, setPrimaryFont] = useState(brand.fonts?.primary ?? 'Inter');
  const [secondaryFont, setSecondaryFont] = useState(brand.fonts?.secondary ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await updateBrand(brand.id, {
        fonts: {
          primary: primaryFont,
          ...(secondaryFont ? { secondary: secondaryFont } : {}),
        },
      });
      toast.success('Typography updated');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }, [brand.id, primaryFont, secondaryFont, updateBrand]);

  const datalistId = 'font-presets';

  return (
    <Section>
      <datalist id={datalistId}>
        {FONT_PRESETS.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>

      <Field label="Primary Font" htmlFor="font-primary">
        <Input
          id="font-primary"
          list={datalistId}
          value={primaryFont}
          onChange={(e) => setPrimaryFont(e.target.value)}
          placeholder="Inter"
        />
      </Field>

      <Field label="Secondary Font" htmlFor="font-secondary">
        <Input
          id="font-secondary"
          list={datalistId}
          value={secondaryFont}
          onChange={(e) => setSecondaryFont(e.target.value)}
          placeholder="Optional"
        />
      </Field>

      <SaveButton saving={saving} onClick={handleSave} />
    </Section>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// VOICE TAB
// ═════════════════════════════════════════════════════════════════════════
function VoiceTab({ brand }: { brand: Brand }) {
  const updateBrand = useBrandStore((s) => s.update);
  const [tone, setTone] = useState(brand.tone ?? '');
  const [audience, setAudience] = useState(brand.audience ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await updateBrand(brand.id, { tone, audience });
      toast.success('Voice settings updated');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }, [brand.id, tone, audience, updateBrand]);

  return (
    <Section>
      <Field label="Tone" htmlFor="voice-tone">
        <Input
          id="voice-tone"
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          placeholder="Professional, friendly, bold..."
        />
      </Field>

      <Field label="Audience" htmlFor="voice-audience">
        <Textarea
          id="voice-audience"
          rows={3}
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          placeholder="Describe your target audience..."
        />
      </Field>

      <SaveButton saving={saving} onClick={handleSave} />
    </Section>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// STRATEGY TAB
// ═════════════════════════════════════════════════════════════════════════
function StrategyTab({ brand }: { brand: Brand }) {
  const updateBrand = useBrandStore((s) => s.update);
  const strategy = brand.guidelines?.strategy;

  const [mission, setMission] = useState(strategy?.mission ?? '');
  const [vision, setVision] = useState(strategy?.vision ?? '');
  const [values, setValues] = useState(
    strategy?.values?.join(', ') ?? '',
  );
  const [positioning, setPositioning] = useState(
    strategy?.positioning ?? '',
  );
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await updateBrand(brand.id, {
        guidelines: {
          ...brand.guidelines,
          strategy: {
            ...brand.guidelines?.strategy,
            mission,
            vision,
            values: values
              .split(',')
              .map((v) => v.trim())
              .filter(Boolean),
            positioning,
          },
        },
      });
      toast.success('Strategy updated');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }, [brand, mission, vision, values, positioning, updateBrand]);

  return (
    <Section>
      <Field label="Mission" htmlFor="strat-mission">
        <Textarea
          id="strat-mission"
          rows={3}
          value={mission}
          onChange={(e) => setMission(e.target.value)}
          placeholder="Our mission is to..."
        />
      </Field>

      <Field label="Vision" htmlFor="strat-vision">
        <Textarea
          id="strat-vision"
          rows={3}
          value={vision}
          onChange={(e) => setVision(e.target.value)}
          placeholder="We envision a world where..."
        />
      </Field>

      <Field label="Values" htmlFor="strat-values">
        <Textarea
          id="strat-values"
          rows={3}
          value={values}
          onChange={(e) => setValues(e.target.value)}
          placeholder="Comma-separated: Innovation, Quality, Trust..."
        />
      </Field>

      <Field label="Positioning" htmlFor="strat-positioning">
        <Textarea
          id="strat-positioning"
          rows={3}
          value={positioning}
          onChange={(e) => setPositioning(e.target.value)}
          placeholder="How the brand is positioned in the market..."
        />
      </Field>

      <SaveButton saving={saving} onClick={handleSave} />
    </Section>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// SHARING TAB
// ═════════════════════════════════════════════════════════════════════════
function SharingTab({ brand }: { brand: Brand }) {
  const updateBrand = useBrandStore((s) => s.update);
  const [isPublic, setIsPublic] = useState(brand.isPublic ?? false);
  const [customDomain, setCustomDomain] = useState(
    brand.customDomain ?? '',
  );
  const [saving, setSaving] = useState(false);

  const publicUrl =
    brand.publicUrl ??
    (isPublic
      ? `${window.location.origin}/b/${brand.slug}`
      : undefined);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await updateBrand(brand.id, {
        isPublic,
        customDomain: customDomain || undefined,
      });
      toast.success('Sharing settings updated');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }, [brand.id, isPublic, customDomain, updateBrand]);

  return (
    <Section>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Public Access</Label>
          <p className="text-xs text-muted-foreground">
            Allow anyone with the link to view this brand.
          </p>
        </div>
        <Switch checked={isPublic} onCheckedChange={setIsPublic} />
      </div>

      {isPublic && publicUrl && (
        <Field label="Public URL">
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground truncate">
              {publicUrl}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(publicUrl);
                toast.success('URL copied');
              }}
            >
              Copy
            </Button>
          </div>
        </Field>
      )}

      <Field label="Custom Domain" htmlFor="sharing-domain">
        <Input
          id="sharing-domain"
          value={customDomain}
          onChange={(e) => setCustomDomain(e.target.value)}
          placeholder="brand.example.com"
        />
      </Field>

      <SaveButton saving={saving} onClick={handleSave} />
    </Section>
  );
}
