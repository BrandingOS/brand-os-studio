/**
 * BrandSettingsHub — the canonical brand settings form.
 *
 * This is the SINGLE source of truth for editing the brand. Used by:
 *   - Brand Kit page (embedded as the first section)
 *   - /b/:slug/settings standalone route
 *   - Legacy SettingsModule (refactored to delegate here)
 *
 * Reads from useBrandStore so updates propagate to every other surface
 * (Brand Kit, Brand Portal, Identity tabs, Public Portal, etc.) instantly
 * without prop drilling. Writes via useBrandStore.update() which flushes
 * through the existing service layer to Supabase / localStorage.
 *
 * Purposefully has zero props — drop it anywhere and it Just Works against
 * the active brand.
 */
import * as React from 'react';
import {
  Save,
  Loader2,
  Upload,
  Palette,
  Type,
  Megaphone,
  Users,
  Sparkles,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useBrandStore } from '@/shared/store/brandStore';
import { cn } from '@/lib/utils';
import { useAssetUpload } from '@/shared/assets/useAssetUpload';
import { resolveBrandLogo } from '@/shared/hooks/useBrandLogo';

interface FormState {
  name: string;
  tone: string;
  audience: string;
  primaryColor: string;
  secondaryColor: string;
  fontPrimary: string;
  fontSecondary: string;
  logo: string;
}

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

export interface BrandSettingsHubProps {
  /** When true, renders without the outer card shell so it can sit inside another card. */
  bare?: boolean;
}

export function BrandSettingsHub({ bare = false }: BrandSettingsHubProps) {
  const current = useBrandStore((s) => s.current);
  const updateBrand = useBrandStore((s) => s.update);
  const { upload: uploadLogo, removeRole } = useAssetUpload(current?.id);

  const [form, setForm] = React.useState<FormState | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);

  // Hydrate when brand loads / changes — always read logo via v3 resolver
  // so we stay in sync whether the brand is migrated or still legacy.
  React.useEffect(() => {
    if (!current) return;
    const resolvedLogo = resolveBrandLogo(current, 'primary')?.url ?? current.logo ?? '';
    setForm({
      name: current.name ?? '',
      tone: current.tone ?? '',
      audience: current.audience ?? '',
      primaryColor: current.primaryColor ?? '#7c3aed',
      secondaryColor: current.secondaryColor ?? '',
      fontPrimary: current.fonts?.primary ?? 'Inter',
      fontSecondary: current.fonts?.secondary ?? '',
      logo: resolvedLogo,
    });
    setDirty(false);
  }, [current]);

  if (!current || !form) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Loading brand…
      </div>
    );
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setDirty(true);
  };

  // v3 upload: writes BrandAsset + logoSystem.primary ref atomically
  // through the store. No separate save step — the UI just reflects
  // the new logo on the next render.
  const handleLogoUpload = async (file: File) => {
    const asset = await uploadLogo(file, { role: 'primary', silent: true });
    if (asset) {
      const next = asset.formats.svg?.url ?? asset.formats.png?.url ?? asset.formats.webp?.url;
      if (next) set('logo', next);
    }
  };

  const handleLogoClear = async () => {
    set('logo', '');
    await removeRole('primary');
  };

  const handleSave = async () => {
    if (!current || !form) return;
    setSaving(true);
    const id = toast.loading('Saving brand…');
    try {
      // Logo writes are handled by useAssetUpload directly — don't
      // include `logo` here or we'd overwrite the v3 ref with the
      // resolved URL and break the single-source-of-truth invariant.
      await updateBrand(current.id, {
        name: form.name.trim() || current.name,
        primaryColor: form.primaryColor,
        secondaryColor: form.secondaryColor || undefined,
        fonts: {
          primary: form.fontPrimary || 'Inter',
          secondary: form.fontSecondary || undefined,
        },
        tone: form.tone,
        audience: form.audience,
      });
      setDirty(false);
      toast.success('Brand saved · all surfaces updated', { id });
    } catch (err) {
      console.error('[BrandSettingsHub] save failed', err);
      toast.error(`Save failed · ${err instanceof Error ? err.message : 'unknown'}`, { id });
    } finally {
      setSaving(false);
    }
  };

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    bare ? <>{children}</> : <div className="rounded-2xl border border-border bg-card">{children}</div>;

  return (
    <Wrapper>
      <div className="space-y-8 p-6">
        {/* Identity row: logo + brand name + tone */}
        <section className="grid gap-6 md:grid-cols-[160px_1fr]">
          <div>
            <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Logo
            </label>
            <LogoUploadField
              logo={form.logo}
              brandName={form.name || current.name}
              primary={form.primaryColor}
              onUpload={handleLogoUpload}
              onClear={handleLogoClear}
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Brand name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-base font-semibold text-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <Megaphone className="mr-1 inline-block h-3 w-3" />
                Voice / Tone
              </label>
              <input
                type="text"
                value={form.tone}
                onChange={(e) => set('tone', e.target.value)}
                placeholder="e.g. Direct, Strategic & Precision-Driven"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <Users className="mr-1 inline-block h-3 w-3" />
                Audience
              </label>
              <textarea
                value={form.audience}
                onChange={(e) => set('audience', e.target.value)}
                rows={2}
                placeholder="Who is this brand for?"
                className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
          </div>
        </section>

        {/* Colors row */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Palette className="h-3.5 w-3.5 text-primary" />
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Brand colors
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ColorField
              label="Primary"
              role="Main brand color · use sparingly"
              value={form.primaryColor}
              onChange={(v) => set('primaryColor', v)}
            />
            <ColorField
              label="Secondary"
              role="Accent color · highlights"
              value={form.secondaryColor || '#06b6d4'}
              onChange={(v) => set('secondaryColor', v)}
              optional
              isEmpty={!form.secondaryColor}
              onClear={() => set('secondaryColor', '')}
            />
          </div>
        </section>

        {/* Typography row */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Type className="h-3.5 w-3.5 text-primary" />
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Typography
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FontField
              label="Primary font"
              hint="Headlines & display"
              value={form.fontPrimary}
              onChange={(v) => set('fontPrimary', v)}
            />
            <FontField
              label="Secondary font"
              hint="Body & UI"
              value={form.fontSecondary}
              onChange={(v) => set('fontSecondary', v)}
            />
          </div>
        </section>

        {/* Save bar */}
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3">
          <div className="text-[11px] text-muted-foreground">
            <Sparkles className="mr-1 inline-block h-3 w-3 text-primary" />
            Single source of truth · changes propagate to every surface
            {dirty && <span className="ml-2 font-semibold text-amber-400">· unsaved</span>}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold transition',
              dirty && !saving
                ? 'bg-primary text-primary-foreground hover:opacity-90'
                : 'border border-border bg-card text-muted-foreground',
            )}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
          </button>
        </div>
      </div>
    </Wrapper>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────

function LogoUploadField({
  logo,
  brandName,
  primary,
  onUpload,
  onClear,
}: {
  logo: string;
  brandName: string;
  primary: string;
  onUpload: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = '';
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-card transition hover:border-primary/40 hover:bg-card/80"
      >
        {logo ? (
          <img src={logo} alt={brandName} className="max-h-[80%] max-w-[80%] object-contain" />
        ) : (
          <div
            className="flex h-16 w-16 items-center justify-center rounded-xl text-2xl font-bold text-white"
            style={{ backgroundColor: primary }}
          >
            {brandName?.[0]?.toUpperCase() ?? '?'}
          </div>
        )}
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-background/90 py-1.5 text-[10px] font-semibold text-foreground opacity-0 transition group-hover:opacity-100">
          <Upload className="h-2.5 w-2.5" />
          {logo ? 'Replace' : 'Upload'}
        </span>
      </button>
      {logo && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-1 top-1 rounded-md bg-background/80 p-1 text-muted-foreground backdrop-blur hover:text-red-400"
          aria-label="Clear logo"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

function ColorField({
  label,
  role,
  value,
  onChange,
  optional,
  isEmpty,
  onClear,
}: {
  label: string;
  role: string;
  value: string;
  onChange: (v: string) => void;
  optional?: boolean;
  isEmpty?: boolean;
  onClear?: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/50 p-3">
      <div className="flex items-center gap-3">
        <label className="relative flex-shrink-0">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-12 w-12 cursor-pointer rounded-lg border border-border bg-transparent"
          />
          {isEmpty && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-background/90 text-[10px] font-semibold text-muted-foreground">
              +
            </div>
          )}
        </label>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-semibold text-foreground">{label}</span>
            {optional && isEmpty && <span className="text-[9px] text-muted-foreground">optional</span>}
          </div>
          <input
            type="text"
            value={isEmpty ? '' : value}
            placeholder="#hex"
            onChange={(e) => onChange(e.target.value)}
            className="mt-1 w-full bg-transparent font-mono text-[11px] text-muted-foreground focus:text-foreground focus:outline-none"
          />
          <div className="mt-0.5 truncate text-[10px] text-muted-foreground/70">{role}</div>
        </div>
        {optional && !isEmpty && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="rounded p-1 text-muted-foreground hover:text-red-400"
            aria-label="Clear"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

function FontField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/50 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-foreground">{label}</span>
        <span className="text-[10px] text-muted-foreground">{hint}</span>
      </div>
      <input
        type="text"
        value={value}
        list={`font-presets-${label}`}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Font family"
        className="mt-2 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus:border-primary/50 focus:outline-none"
        style={{ fontFamily: value || 'inherit' }}
      />
      <datalist id={`font-presets-${label}`}>
        {FONT_PRESETS.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>
      <div className="mt-2 text-[10px] text-muted-foreground">
        Preview: <span style={{ fontFamily: value || 'inherit' }} className="text-foreground">The brand speaks · Aa Bb Cc 123</span>
      </div>
    </div>
  );
}
