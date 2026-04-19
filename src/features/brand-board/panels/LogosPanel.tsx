/**
 * LogosPanel — shows every logo slot the brand has, with inline upload.
 *
 * Clicking a tile no longer navigates away from Brand Board — it opens
 * the native file picker scoped to that logo slot. On pick we persist
 * the new artwork to the brand (as a data URL fallback) and the tile
 * refreshes. Users stay in the Brand Board design flow.
 */
import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Wand2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useBrandStore } from '@/shared/store/brandStore';
import { resolveBrandLogo } from '@/shared/hooks/useBrandLogo';
import { storageService } from '@/shared/services/storage.supabase';
import type { LogoRole } from '@/shared/types/brandAssets';

interface LogoSlot {
  role: LogoRole;
  label: string;
  /** dark = place on dark background, light = place on light background */
  surface: 'light' | 'dark';
}

const SLOTS: LogoSlot[] = [
  { role: 'primary',    label: 'Primary',   surface: 'light' },
  { role: 'iconmark',   label: 'Mark',      surface: 'light' },
  { role: 'horizontal', label: 'Wordmark',  surface: 'light' },
  { role: 'mono.white', label: 'Inverse',   surface: 'dark' },
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
  onUpload,
  uploading,
  fallbackInitial,
  fallbackColor,
}: {
  slot: LogoSlot;
  url?: string;
  onUpload: (file: File) => void;
  uploading: boolean;
  fallbackInitial?: string;
  fallbackColor?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dark = slot.surface === 'dark';
  return (
    <div
      className="group relative rounded-2xl overflow-hidden"
      style={{
        background: dark ? '#0f0f12' : '#ffffff',
        aspectRatio: '1 / 1',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 6px 16px -10px rgba(0,0,0,0.10)',
      }}
    >
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        title={`Upload ${slot.label} logo`}
        className="absolute inset-0 cursor-pointer"
        aria-label={`Upload ${slot.label} logo`}
      />
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
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = ''; // allow re-upload of same filename
        }}
        tabIndex={-1}
      />
    </div>
  );
}

export function LogosPanel() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const currentBrand = useBrandStore((s) => s.current);
  const updateBrand = useBrandStore((s) => s.update);

  const [uploading, setUploading] = useState<LogoRole | null>(null);

  const tiles = useMemo(() => {
    if (!currentBrand) return SLOTS.map((s) => ({ slot: s, url: undefined as string | undefined }));
    return SLOTS.map((s) => ({
      slot: s,
      url: resolveBrandLogo(currentBrand, s.role)?.url,
    }));
  }, [currentBrand]);

  const initial = currentBrand?.name?.charAt(0).toUpperCase() ?? 'B';
  const primaryColor = currentBrand?.primaryColor;

  const handleUpload = async (role: LogoRole, file: File) => {
    if (!currentBrand) return;
    setUploading(role);
    try {
      let url: string;
      try {
        const result = await storageService.uploadAsset(
          currentBrand.id,
          file,
          `brand-board/${role}-${Date.now()}-${file.name}`,
        );
        url = result.url;
      } catch {
        // Supabase storage fallback — embed as data URL so the upload still
        // succeeds locally. The brand can be uploaded properly later.
        url = await fileToDataUrl(file);
      }

      // For the primary slot, also overwrite the legacy `logo` field so the
      // rest of the app (brand switcher, showcase, etc.) sees the new logo.
      const patch: Record<string, any> = {
        logoSystem: {
          ...(currentBrand.logoSystem ?? {}),
        },
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
    } catch (e) {
      console.error('[LogosPanel] upload failed', e);
      toast.error('Upload failed. Try another file.');
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
        {tiles.map(({ slot, url }) => (
          <LogoTile
            key={slot.role}
            slot={slot}
            url={url}
            uploading={uploading === slot.role}
            onUpload={(file) => handleUpload(slot.role, file)}
            fallbackInitial={slot.role === 'primary' || slot.role === 'iconmark' ? initial : undefined}
            fallbackColor={primaryColor}
          />
        ))}
      </div>
    </section>
  );
}
