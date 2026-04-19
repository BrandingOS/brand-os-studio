/**
 * LogosPanel — shows every logo slot the brand has, with two sources.
 *
 * Clicking a tile opens a small menu:
 *   • Upload from computer  → native file picker
 *   • Pick from Folders     → brand AssetPicker (reads currentBrand.assets)
 *
 * Either path writes the resulting URL to the matching logoSystem slot
 * and the tile refreshes. User never leaves Brand Board.
 */
import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Wand2, Loader2, Upload as UploadIcon, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useBrandStore } from '@/shared/store/brandStore';
import { resolveBrandLogo } from '@/shared/hooks/useBrandLogo';
import { storageService } from '@/shared/services/storage.supabase';
import { AssetPicker } from '@/shared/upload/AssetPicker';
import type { Asset } from '@/shared/types/brand';
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

/**
 * A single logo slot tile. Renders the current logo (or a fallback) and
 * exposes a dropdown menu so the user can upload from their computer OR
 * pick an existing asset from the brand's Folders.
 */
function LogoTile({
  slot,
  url,
  onUploadFile,
  onPickFromFolders,
  uploading,
  fallbackInitial,
  fallbackColor,
}: {
  slot: LogoSlot;
  url?: string;
  onUploadFile: (file: File) => void;
  onPickFromFolders: () => void;
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title={`Change ${slot.label} logo`}
            className="absolute inset-0 cursor-pointer"
            aria-label={`Change ${slot.label} logo`}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuItem onSelect={() => inputRef.current?.click()}>
            <UploadIcon className="h-3.5 w-3.5 mr-2" />
            Upload from computer
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onPickFromFolders}>
            <FolderOpen className="h-3.5 w-3.5 mr-2" />
            Pick from Folders
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
          if (file) onUploadFile(file);
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
  const [pickingFor, setPickingFor] = useState<LogoRole | null>(null);

  const tiles = useMemo(() => {
    if (!currentBrand) return SLOTS.map((s) => ({ slot: s, url: undefined as string | undefined }));
    return SLOTS.map((s) => ({
      slot: s,
      url: resolveBrandLogo(currentBrand, s.role)?.url,
    }));
  }, [currentBrand]);

  const initial = currentBrand?.name?.charAt(0).toUpperCase() ?? 'B';
  const primaryColor = currentBrand?.primaryColor;

  /** Apply a resolved logo URL into the matching logoSystem slot. */
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

  /** Handle a file dropped in via the OS picker — upload, then apply. */
  const handleUploadFile = async (role: LogoRole, file: File) => {
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
        url = await fileToDataUrl(file);
      }
      await applyLogo(role, url);
    } catch (e) {
      console.error('[LogosPanel] upload failed', e);
      toast.error('Upload failed. Try another file.');
    } finally {
      setUploading(null);
    }
  };

  /** Handle an asset picked from the brand Folders. */
  const handlePickAsset = async (role: LogoRole, asset: Asset) => {
    setUploading(role);
    try {
      await applyLogo(role, asset.url);
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
            onUploadFile={(file) => handleUploadFile(slot.role, file)}
            onPickFromFolders={() => setPickingFor(slot.role)}
            fallbackInitial={slot.role === 'primary' || slot.role === 'iconmark' ? initial : undefined}
            fallbackColor={primaryColor}
          />
        ))}
      </div>

      {/* Shared asset picker — scopes to image-like assets so the user
          isn't flipping through fonts or docs when picking a logo. */}
      <AssetPicker
        open={pickingFor !== null}
        onClose={() => setPickingFor(null)}
        onSelect={(asset) => {
          if (pickingFor) handlePickAsset(pickingFor, asset);
          setPickingFor(null);
        }}
        categories={['logo', 'icon', 'reference']}
        types={['image']}
        title="Pick a logo from Folders"
      />
    </section>
  );
}
