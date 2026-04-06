/**
 * ImageInspector — edits the currently selected image element.
 *
 * Provides:
 *   - Replace from brand assets (opens AssetPicker)
 *   - Replace by upload (opens UploadButton)
 *   - object-fit toggle (cover / contain / fill)
 *   - opacity slider
 *   - filter presets (none / grayscale / invert)
 */

import { useState } from 'react';
import { Image as ImageIcon, Replace } from 'lucide-react';
import { useSelectionStore } from '../selection/selectionStore';
import { AssetPicker } from '@/shared/upload/AssetPicker';
import { UploadButton } from '@/shared/upload/UploadButton';

const FITS = ['cover', 'contain', 'fill'] as const;
const FILTERS = [
  { label: 'None', value: 'none' },
  { label: 'B&W', value: 'grayscale(1)' },
  { label: 'Invert', value: 'brightness(0) invert(1)' },
];

export function ImageInspector() {
  const selected = useSelectionStore((s) => s.selected);
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!selected || selected.type !== 'image' || !selected.el) return null;
  const el = selected.el as HTMLImageElement;

  const apply = (style: Partial<CSSStyleDeclaration>) => {
    Object.assign(el.style, style);
  };

  const replaceSrc = (url: string) => {
    el.src = url;
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Replace</label>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded border border-gray-200 hover:bg-gray-50 text-sm"
          >
            <ImageIcon className="h-4 w-4" /> From brand assets
          </button>
          <UploadButton
            kind="image"
            onUploaded={(r) => replaceSrc(r.url)}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded border border-gray-200 hover:bg-gray-50 text-sm"
          >
            <Replace className="h-4 w-4" /> Upload new
          </UploadButton>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Fit</label>
        <div className="flex gap-1">
          {FITS.map((fit) => (
            <button
              key={fit}
              onClick={() => apply({ objectFit: fit })}
              className="flex-1 px-2 py-1.5 text-xs rounded border border-gray-200 hover:bg-gray-50 capitalize"
            >
              {fit}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Filter</label>
        <div className="grid grid-cols-3 gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => apply({ filter: f.value })}
              className="px-2 py-1.5 text-xs rounded border border-gray-200 hover:bg-gray-50"
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Opacity</label>
        <input
          type="range"
          min="0"
          max="100"
          defaultValue="100"
          onChange={(e) => apply({ opacity: String(Number(e.target.value) / 100) })}
          className="w-full"
        />
      </div>

      <AssetPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(asset) => replaceSrc(asset.url)}
        title="Choose Image"
      />
    </div>
  );
}
