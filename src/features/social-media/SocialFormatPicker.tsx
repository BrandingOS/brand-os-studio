/**
 * SocialFormatPicker — modal for picking a social media platform/format.
 * Returns the selected SocialMediaSize so the editor can open with the
 * correct canvas dimensions.
 */
import { useState } from 'react';
import { X, Check, Instagram, Facebook, Twitter, Linkedin, Youtube, Layers, Grid3X3 } from 'lucide-react';
import { SOCIAL_MEDIA_SIZES } from './data/sizes';
import type { SocialMediaSize, SocialPlatform } from './types';

const PLATFORM_INFO: Record<SocialPlatform, { label: string; icon: React.ElementType; color: string }> = {
  instagram: { label: 'Instagram', icon: Instagram, color: '#E4405F' },
  facebook: { label: 'Facebook', icon: Facebook, color: '#1877F2' },
  twitter: { label: 'Twitter / X', icon: Twitter, color: '#1DA1F2' },
  linkedin: { label: 'LinkedIn', icon: Linkedin, color: '#0A66C2' },
  tiktok: { label: 'TikTok', icon: Layers, color: '#000000' },
  youtube: { label: 'YouTube', icon: Youtube, color: '#FF0000' },
  pinterest: { label: 'Pinterest', icon: Grid3X3, color: '#E60023' },
};

interface SocialFormatPickerProps {
  onSelect: (size: SocialMediaSize) => void;
  onClose: () => void;
  brandColor?: string;
}

export function SocialFormatPicker({ onSelect, onClose, brandColor = '#3B82F6' }: SocialFormatPickerProps) {
  const [activePlatform, setActivePlatform] = useState<SocialPlatform>('instagram');

  // Skip tiny profile sizes that don't make sense in the editor
  const formats = SOCIAL_MEDIA_SIZES.filter(
    (s) => s.platform === activePlatform && s.format !== 'profile'
  );

  const platforms = Object.keys(PLATFORM_INFO) as SocialPlatform[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[85vh] mx-4 bg-[#111] rounded-2xl border border-white/[0.08] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
          <div>
            <h2 className="text-base font-semibold text-white/90">Create Social Media Design</h2>
            <p className="text-xs text-white/30 mt-0.5">Pick a platform and format to start designing</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Platform tabs */}
        <div className="px-6 pt-4 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
            {platforms.map((p) => {
              const info = PLATFORM_INFO[p];
              const Icon = info.icon;
              const active = activePlatform === p;
              return (
                <button
                  key={p}
                  onClick={() => setActivePlatform(p)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    active
                      ? 'bg-white/10 text-white border border-white/15'
                      : 'text-white/30 hover:text-white/60 hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: active ? info.color : undefined }} />
                  {info.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Format grid */}
        <div className="flex-1 overflow-y-auto p-6 pt-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {formats.map((format) => {
              // Compute thumbnail aspect ratio (capped for visual consistency)
              const ratio = format.width / format.height;
              const isPortrait = ratio < 1;
              return (
                <button
                  key={`${format.platform}-${format.format}`}
                  onClick={() => onSelect(format)}
                  className="group rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04] p-4 transition-all text-left"
                >
                  {/* Aspect ratio preview */}
                  <div className="flex items-center justify-center mb-3 h-24">
                    <div
                      className="border border-white/15 bg-white/[0.04] rounded"
                      style={{
                        aspectRatio: `${format.width} / ${format.height}`,
                        height: isPortrait ? '100%' : 'auto',
                        width: isPortrait ? 'auto' : '100%',
                        maxHeight: '100%',
                        maxWidth: '100%',
                      }}
                    />
                  </div>
                  <p className="text-xs font-medium text-white/80">{format.label}</p>
                  <p className="text-[10px] text-white/30 mt-0.5 font-mono">
                    {format.width} × {format.height}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
