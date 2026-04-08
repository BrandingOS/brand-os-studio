import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, GripVertical } from 'lucide-react';
import { compressLogo, validateUploadFile } from '@/shared/utils/imageUpload';
import { toast } from 'sonner';
import { AssetPicker } from '@/shared/ui/AssetPicker';
import { useBrandStore } from '@/shared/store/brandStore';
import type { Asset } from '@/shared/types/brand';

interface LogoUploaderProps {
  brandId: string;
  logoSystem: any;
  onLogoSystemChange: (logoSystem: any) => void;
}

/**
 * Each logo type with a description and a simple SVG placeholder
 * so users understand what each slot is for.
 */
const LOGO_TYPES = [
  {
    key: 'primary',
    label: 'Primary Logo',
    description: 'Full logo with icon + text. Used on websites, documents, and main branding.',
    placeholder: (
      <svg viewBox="0 0 120 60" className="w-full h-full" fill="none">
        <rect x="8" y="15" width="30" height="30" rx="6" fill="currentColor" opacity="0.15" />
        <rect x="12" y="19" width="22" height="22" rx="4" fill="currentColor" opacity="0.25" />
        <rect x="46" y="22" width="66" height="6" rx="3" fill="currentColor" opacity="0.2" />
        <rect x="46" y="33" width="44" height="4" rx="2" fill="currentColor" opacity="0.12" />
      </svg>
    ),
  },
  {
    key: 'logotype',
    label: 'Logotype',
    description: 'Text-only version of the logo. No icon, just the brand name in the brand font.',
    placeholder: (
      <svg viewBox="0 0 120 60" className="w-full h-full" fill="none">
        <rect x="10" y="22" width="100" height="8" rx="4" fill="currentColor" opacity="0.2" />
        <rect x="20" y="34" width="80" height="4" rx="2" fill="currentColor" opacity="0.1" />
      </svg>
    ),
  },
  {
    key: 'brandmark',
    label: 'Brandmark',
    description: 'Icon/symbol only. Used for app icons, favicons, and small placements.',
    placeholder: (
      <svg viewBox="0 0 120 60" className="w-full h-full" fill="none">
        <rect x="35" y="8" width="50" height="44" rx="12" fill="currentColor" opacity="0.15" />
        <circle cx="60" cy="30" r="14" fill="currentColor" opacity="0.2" />
      </svg>
    ),
  },
  {
    key: 'submark',
    label: 'Submark',
    description: 'Compact alternate mark. A simplified version for tight spaces or watermarks.',
    placeholder: (
      <svg viewBox="0 0 120 60" className="w-full h-full" fill="none">
        <circle cx="60" cy="30" r="22" stroke="currentColor" strokeWidth="2" opacity="0.2" fill="none" />
        <rect x="48" y="24" width="24" height="5" rx="2.5" fill="currentColor" opacity="0.2" />
        <rect x="52" y="32" width="16" height="3" rx="1.5" fill="currentColor" opacity="0.12" />
      </svg>
    ),
  },
  {
    key: 'black',
    label: 'Black Version',
    description: 'Single-color black logo for print, fax, and monochrome contexts.',
    placeholder: (
      <svg viewBox="0 0 120 60" className="w-full h-full" fill="none">
        <rect x="8" y="15" width="30" height="30" rx="6" fill="#000" opacity="0.7" />
        <rect x="46" y="24" width="60" height="6" rx="3" fill="#000" opacity="0.5" />
        <rect x="46" y="34" width="40" height="4" rx="2" fill="#000" opacity="0.3" />
      </svg>
    ),
  },
  {
    key: 'white',
    label: 'White Version',
    description: 'Reversed white logo for dark backgrounds, video overlays, and events.',
    placeholder: (
      <svg viewBox="0 0 120 60" className="w-full h-full" fill="none">
        <rect width="120" height="60" rx="8" fill="#1a1a2e" />
        <rect x="8" y="15" width="30" height="30" rx="6" fill="#fff" opacity="0.8" />
        <rect x="46" y="24" width="60" height="6" rx="3" fill="#fff" opacity="0.6" />
        <rect x="46" y="34" width="40" height="4" rx="2" fill="#fff" opacity="0.35" />
      </svg>
    ),
  },
  {
    key: 'icon',
    label: 'Icon / Favicon',
    description: 'Smallest mark — 16-64px. For browser tabs, app shortcuts, and social avatars.',
    placeholder: (
      <svg viewBox="0 0 120 60" className="w-full h-full" fill="none">
        <rect x="38" y="10" width="44" height="40" rx="10" fill="currentColor" opacity="0.12" />
        <rect x="46" y="18" width="28" height="24" rx="6" fill="currentColor" opacity="0.22" />
      </svg>
    ),
  },
];

export function LogoUploader({ brandId, logoSystem, onLogoSystemChange }: LogoUploaderProps) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  // Read the active brand from the store so AssetPicker can show its asset
  // library. We don't refetch here — the page above already loaded the
  // brand and seeded the store.
  const currentBrand = useBrandStore((s) => s.current);

  // Adopt an existing brand asset into a logo slot. Mirrors the upload
  // shape so the rest of LogoUploader doesn't care which path filled it.
  const handlePickAsset = (logoType: string, asset: Asset) => {
    if (!asset.url) return;
    onLogoSystemChange({
      ...logoSystem,
      [logoType]: {
        url: asset.url,
        description: `${logoType} logo`,
        usage: 'General use',
      },
    });
    toast.success(
      `${LOGO_TYPES.find((t) => t.key === logoType)?.label || logoType} set from ${asset.name}`,
    );
  };

  // ─── File Upload ────────────────────────────────────────────
  const handleFileUpload = async (logoType: string, file: File) => {
    const validation = validateUploadFile(file, { maxSizeMB: 10, acceptedTypes: ['image/'] });
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    try {
      setUploading(logoType);
      toast.loading('Compressing image...');
      const dataUrl = await compressLogo(file);
      toast.dismiss();

      onLogoSystemChange({
        ...logoSystem,
        [logoType]: {
          url: dataUrl,
          description: `${logoType} logo`,
          usage: 'General use',
        },
      });

      toast.success(`${LOGO_TYPES.find(t => t.key === logoType)?.label || logoType} uploaded`);
    } catch (error) {
      toast.dismiss();
      toast.error(error instanceof Error ? error.message : 'Failed to upload logo');
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveLogo = (logoType: string) => {
    const updatedLogos = { ...logoSystem };
    delete updatedLogos[logoType];
    onLogoSystemChange(updatedLogos);
    toast.success(`${LOGO_TYPES.find(t => t.key === logoType)?.label || logoType} removed`);
  };

  // ─── Drag & Drop Between Slots ──────────────────────────────
  const handleDragStart = useCallback((e: React.DragEvent, sourceKey: string) => {
    if (!logoSystem[sourceKey]?.url) return;
    setDragSource(sourceKey);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', sourceKey);
  }, [logoSystem]);

  const handleDragOverSlot = useCallback((e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    if (dragSource && dragSource !== targetKey) {
      e.dataTransfer.dropEffect = 'move';
      setDragOver(targetKey);
    }
  }, [dragSource]);

  const handleDragLeaveSlot = useCallback(() => {
    setDragOver(null);
  }, []);

  const handleDropOnSlot = useCallback((e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    setDragOver(null);

    const sourceKey = e.dataTransfer.getData('text/plain') || dragSource;
    if (!sourceKey || sourceKey === targetKey) {
      setDragSource(null);
      return;
    }

    const sourceData = logoSystem[sourceKey];
    if (!sourceData?.url) {
      setDragSource(null);
      return;
    }

    // Swap or move
    const updated = { ...logoSystem };
    const targetData = logoSystem[targetKey];

    if (targetData?.url) {
      // Swap: both have logos
      updated[targetKey] = { ...sourceData, description: `${targetKey} logo` };
      updated[sourceKey] = { ...targetData, description: `${sourceKey} logo` };
      toast.success(`Swapped ${LOGO_TYPES.find(t => t.key === sourceKey)?.label} ↔ ${LOGO_TYPES.find(t => t.key === targetKey)?.label}`);
    } else {
      // Move: target is empty
      updated[targetKey] = { ...sourceData, description: `${targetKey} logo` };
      delete updated[sourceKey];
      toast.success(`Moved to ${LOGO_TYPES.find(t => t.key === targetKey)?.label}`);
    }

    onLogoSystemChange(updated);
    setDragSource(null);
  }, [dragSource, logoSystem, onLogoSystemChange]);

  const handleDragEnd = useCallback(() => {
    setDragSource(null);
    setDragOver(null);
  }, []);

  // ─── External File Drop ─────────────────────────────────────
  const handleExternalDrop = useCallback(async (e: React.DragEvent, targetKey: string) => {
    // If dropping from another slot, let handleDropOnSlot handle it
    if (dragSource) return;

    e.preventDefault();
    setDragOver(null);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      await handleFileUpload(targetKey, file);
    }
  }, [dragSource]);

  return (
    <div className="brand-card p-8">
      <div className="flex items-center justify-between mb-2">
        <h3 className="brand-section-title !mb-0">Logos</h3>
        <span className="text-[10px] text-gray-400">Drag between slots to rearrange</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
        {LOGO_TYPES.map((type) => {
          const hasLogo = !!logoSystem[type.key]?.url;
          const isDraggedOver = dragOver === type.key;
          const isBeingDragged = dragSource === type.key;

          return (
            <div
              key={type.key}
              className="space-y-1.5"
              onDragOver={(e) => {
                e.preventDefault();
                handleDragOverSlot(e, type.key);
              }}
              onDragLeave={handleDragLeaveSlot}
              onDrop={(e) => {
                if (dragSource) {
                  handleDropOnSlot(e, type.key);
                } else {
                  handleExternalDrop(e, type.key);
                }
              }}
            >
              <label className="text-xs font-medium text-gray-500 block truncate" title={type.label}>
                {type.label}
              </label>

              {hasLogo ? (
                /* ─── Filled Slot ──────────────────────── */
                <div
                  className={`relative group transition-all duration-200 ${
                    isBeingDragged ? 'opacity-40 scale-95' : ''
                  } ${isDraggedOver ? 'ring-2 ring-primary ring-offset-2 scale-[1.02]' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, type.key)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="aspect-[4/3] bg-gray-50 dark:bg-gray-800 rounded-xl p-3 flex items-center justify-center border border-gray-200 dark:border-gray-700 hover:border-primary/40 transition-all cursor-grab active:cursor-grabbing">
                    <img
                      src={logoSystem[type.key].url}
                      alt={type.label}
                      className="max-w-full max-h-full object-contain pointer-events-none"
                    />
                  </div>
                  {/* Drag handle */}
                  <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-60 transition-opacity">
                    <GripVertical className="h-4 w-4 text-gray-400" />
                  </div>
                  {/* Remove button */}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 shadow-md"
                    onClick={() => handleRemoveLogo(type.key)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                /* ─── Empty Slot — opens the canonical AssetPicker ──── */
                <AssetPicker
                  brand={currentBrand ?? undefined}
                  accept="image/*"
                  filter={(a) => ['logo', 'image', 'icon'].includes(a.type)}
                  onUpload={(file) => handleFileUpload(type.key, file)}
                  onPick={(asset) => handlePickAsset(type.key, asset)}
                  trigger={
                    <button
                      type="button"
                      disabled={uploading === type.key}
                      className={`block w-full cursor-pointer transition-all duration-200 ${
                        isDraggedOver ? 'ring-2 ring-primary ring-offset-2 scale-[1.02]' : ''
                      }`}
                    >
                      <div className="aspect-[4/3] rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-primary/40 bg-gray-50/50 dark:bg-gray-800/50 flex flex-col items-center justify-center gap-1 transition-all hover:bg-gray-100/50 dark:hover:bg-gray-700/30">
                        {uploading === type.key ? (
                          <div className="text-xs text-gray-400">Compressing...</div>
                        ) : (
                          <>
                            <div className="w-16 h-8 text-gray-300 dark:text-gray-600">
                              {type.placeholder}
                            </div>
                            <div className="flex items-center gap-1 text-gray-400">
                              <Upload className="h-3 w-3" />
                              <span className="text-[10px] font-medium">Add logo</span>
                            </div>
                          </>
                        )}
                      </div>
                    </button>
                  }
                />
              )}

              {/* Description tooltip */}
              <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight line-clamp-2">
                {type.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
