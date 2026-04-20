import { X, RotateCw } from 'lucide-react';
import type { OnboardingAsset } from '../types';
import { iconForKind } from '../utils/assetTypeIcon';

interface Props {
  asset: OnboardingAsset;
  onRemove(id: string): void;
  onRetry?(id: string): void;
}

export function UploadTile({ asset, onRemove, onRetry }: Props) {
  const showImage = asset.kind === 'image' && asset.previewUrl;
  const iconSrc = iconForKind(asset.kind);

  return (
    <div className="group relative aspect-square rounded-xl overflow-hidden bg-cosmos-surface-sunken border border-cosmos-border">
      {showImage ? (
        <img src={asset.previewUrl!} alt={asset.filename} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full grid place-items-center">
          <img src={iconSrc} alt="" className="w-10 h-10 opacity-80" />
        </div>
      )}

      {asset.uploadStatus === 'uploading' && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-cosmos-border">
          <div className="h-full bg-cosmos-accent transition-all" style={{ width: `${asset.uploadProgress * 100}%` }} />
        </div>
      )}

      {asset.uploadStatus === 'error' && (
        <div className="absolute inset-0 bg-red-500/10 flex flex-col items-center justify-center gap-1 text-[11px] text-red-600 px-2 text-center">
          <span className="line-clamp-2">{asset.errorMessage ?? 'Upload failed'}</span>
          {onRetry && (
            <button type="button" onClick={() => onRetry(asset.id)} className="inline-flex items-center gap-1 underline">
              <RotateCw size={10} /> retry
            </button>
          )}
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform bg-black/55 text-white text-[11px] px-2 py-1 truncate">
        {asset.filename}
      </div>

      <button
        type="button"
        onClick={() => onRemove(asset.id)}
        className="absolute top-1.5 right-1.5 grid place-items-center w-5 h-5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100"
        aria-label="Remove"
      >
        <X size={10} />
      </button>
    </div>
  );
}
