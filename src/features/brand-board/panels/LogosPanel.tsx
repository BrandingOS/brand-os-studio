/**
 * LogosPanel — every logo slot the brand has, each with the canonical
 * AssetSourcePopover for changing it.
 *
 * Click a tile → inline popover with Upload from device + a scrollable
 * Brand Assets grid. Either source writes the resulting URL to the
 * matching logoSystem slot. User never leaves Brand Board.
 */
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Wand2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useBrandStore } from '@/shared/store/brandStore';
import { resolveBrandLogo } from '@/shared/hooks/useBrandLogo';
import { storageService } from '@/shared/services/storage.supabase';
import { AssetSourcePopover, type AssetSource } from '@/shared/upload/AssetSourcePopover';
import type { LogoRole } from '@/shared/types/brandAssets';

interface LogoSlot {
  role: LogoRole;
  label: string;
  surface: 'light' | 'dark';
}

const SLOTS: LogoSlot[] = [
  { role: 'primary',    label: 'Primary',  surface: 'light' },
  { role: 'iconmark',   label: 'Mark',     surface: 'light' },
  { role: 'horizontal', label: 'Wordmark', surface: 'light' },
  { role: 'mono.white', label: 'Inverse',  surface: 'dark' },
];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function LogoTile({
  slot,
  url,
  uploading,
  fallbackInitial,
  fallbackColor,
  duplicateOf,
  onPickSource,
}: {
  slot: LogoSlot;
  url?: string;
  uploading: boolean;
  fallbackInitial?: string;
  fallbackColor?: string;
  /** When set, the label of an earlier tile this one is a duplicate
   *  of. Surfaces a small badge so the user knows to upload a unique
   *  asset instead of reusing the same image across roles. */
  duplicateOf?: string;
  onPickSource: (source: AssetSource) => void;
}) {
  const dark = slot.surface === 'dark';

  const trigger = (
    <button
      type="button"
      title={
        duplicateOf
          ? `${slot.label} reuses the ${duplicateOf} asset — upload a unique one to avoid duplicates`
          : `Change ${slot.label} logo`
      }
      aria-label={`Change ${slot.label} logo`}
      className="relative rounded-2xl overflow-hidden text-left"
      style={{
        background: dark ? '#0f0f12' : '#ffffff',
        aspectRatio: '1 / 1',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 6px 16px -10px rgba(0,0,0,0.10)',
        outline: duplicateOf ? '1.5px dashed rgba(245,158,11,0.5)' : undefined,
        outlineOffset: duplicateOf ? -3 : undefined,
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center p-3 pointer-events-none">
        {uploading ? (
          <Loader2
            className="h-4 w-4 animate-spin"
            style={{ color: dark ? 'rgba(255,255,255,0.6)' : 'rgba(15,15,18,0.5)' }}
          />
        ) : url ? (
          <img
            src={url}
            alt={slot.label}
            className="max-h-[70%] max-w-[80%] object-contain"
            style={{
              filter: dark && slot.role === 'mono.white' ? 'brightness(0) invert(1)' : undefined,
            }}
          />
        ) : fallbackInitial ? (
          <span
            className="text-xl font-bold tracking-tight"
            style={{
              color: dark ? '#ffffff' : (fallbackColor ?? '#0f0f12'),
              fontFamily: 'var(--bb-font-heading, Inter), sans-serif',
            }}
          >
            {fallbackInitial}
          </span>
        ) : (
          <Plus
            className="h-4 w-4"
            style={{ color: dark ? 'rgba(255,255,255,0.3)' : 'rgba(15,15,18,0.25)' }}
          />
        )}
      </div>
      <span
        className="absolute bottom-1.5 left-0 right-0 text-center text-[9px] font-semibold uppercase tracking-[0.12em] pointer-events-none"
        style={{ color: dark ? 'rgba(255,255,255,0.45)' : 'rgba(15,15,18,0.40)' }}
      >
        {slot.label}
      </span>
      {duplicateOf ? (
        <span
          className="absolute top-1.5 right-1.5 rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] pointer-events-none"
          style={{
            background: 'rgba(245,158,11,0.18)',
            color: '#92500a',
            border: '1px solid rgba(245,158,11,0.4)',
          }}
        >
          Same as {duplicateOf}
        </span>
      ) : null}
    </button>
  );

  return (
    <AssetSourcePopover
      trigger={trigger}
      categories={['logo', 'icon', 'reference']}
      onPick={onPickSource}
    />
  );
}

export function LogosPanel() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const currentBrand = useBrandStore((s) => s.current);
  const updateBrand = useBrandStore((s) => s.update);

  const [uploading, setUploading] = useState<LogoRole | null>(null);

  const tiles = useMemo(() => {
    if (!currentBrand) {
      return SLOTS.map((s) => ({
        slot: s,
        url: undefined as string | undefined,
        duplicateOf: undefined as string | undefined,
      }));
    }
    // Walk slots in display order, recording the first slot for each
    // unique URL. A later slot whose URL matches an earlier one gets
    // tagged with the earlier slot's label so the tile can flag the
    // duplication to the user. Empty slots aren't compared (no URL).
    const seenUrls = new Map<string, string>();
    return SLOTS.map((s) => {
      const url = resolveBrandLogo(currentBrand, s.role)?.url;
      let duplicateOf: string | undefined;
      if (url) {
        const firstLabel = seenUrls.get(url);
        if (firstLabel) {
          duplicateOf = firstLabel;
        } else {
          seenUrls.set(url, s.label);
        }
      }
      return { slot: s, url, duplicateOf };
    });
  }, [currentBrand]);

  const initial = currentBrand?.name?.charAt(0).toUpperCase() ?? 'B';
  const primaryColor = currentBrand?.primaryColor;

  /** Write a resolved URL into the matching logoSystem slot. */
  const applyLogo = async (role: LogoRole, url: string) => {
    if (!currentBrand) return;
    const patch: Record<string, any> = {
      logoSystem: { ...(currentBrand.logoSystem ?? {}) },
    };
    if (role === 'primary') {
      patch.logo = url;
      patch.logoSystem.primary = { url, format: 'png', width: 1024, height: 1024 };
    } else if (role === 'iconmark') {
      patch.logoSystem.iconmark = { url, format: 'png', width: 512, height: 512 };
    } else if (role === 'horizontal') {
      patch.logoSystem.orientations = {
        ...(currentBrand.logoSystem?.orientations ?? {}),
        horizontal: { url, format: 'png', width: 1600, height: 400 },
      };
    } else if (role === 'mono.white') {
      patch.logoSystem.mono = {
        ...(currentBrand.logoSystem?.mono ?? {}),
        white: { url, format: 'png', width: 1024, height: 1024 },
      };
    }
    await updateBrand(currentBrand.id, patch);
    toast.success(`${SLOTS.find((s) => s.role === role)?.label ?? 'Logo'} updated`);
  };

  const handlePick = async (role: LogoRole, source: AssetSource) => {
    if (!currentBrand) return;
    setUploading(role);
    try {
      if (source.kind === 'asset') {
        await applyLogo(role, source.asset.url);
        return;
      }
      // file: upload (with data URL fallback), then apply
      let url: string;
      try {
        const result = await storageService.uploadAsset(
          currentBrand.id,
          source.file,
          `brand-board/${role}-${Date.now()}-${source.file.name}`,
        );
        url = result.url;
      } catch {
        url = await fileToDataUrl(source.file);
      }
      await applyLogo(role, url);
    } catch (e) {
      console.error('[LogosPanel] pick failed', e);
      toast.error('Could not update logo. Try a different file.');
    } finally {
      setUploading(null);
    }
  };

  const goToVariantStudio = () => navigate(`/b/${slug}/tools/variant-studio`);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold tracking-tight text-foreground">Logos</h3>
        <button
          type="button"
          onClick={goToVariantStudio}
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[12px] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-6px_rgba(0,0,0,0.08)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.05),0_6px_16px_-6px_rgba(0,0,0,0.12)] transition-shadow"
        >
          <Wand2 className="h-3 w-3" />
          <span>Variants</span>
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {tiles.map(({ slot, url, duplicateOf }) => (
          <LogoTile
            key={slot.role}
            slot={slot}
            url={url}
            uploading={uploading === slot.role}
            fallbackInitial={slot.role === 'primary' || slot.role === 'iconmark' ? initial : undefined}
            fallbackColor={primaryColor}
            duplicateOf={duplicateOf}
            onPickSource={(source) => handlePick(slot.role, source)}
          />
        ))}
      </div>
    </section>
  );
}
