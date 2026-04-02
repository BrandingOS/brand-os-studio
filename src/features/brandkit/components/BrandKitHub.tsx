import { useNavigate } from 'react-router-dom';
import {
  Settings, Image, BookOpen, CircleUser, Monitor, CreditCard,
  RectangleHorizontal, Square, Smartphone, Presentation, Play,
  QrCode, FileText, PenTool, Palette
} from 'lucide-react';
import type { Brand } from '@/shared/types/brand';
import { BRAND_KIT_MODULES } from '../data/modules';

interface BrandKitHubProps {
  brand: Brand;
  slug: string;
}

const iconMap: Record<string, React.ElementType> = {
  Settings, Image, BookOpen, CircleUser, Monitor, CreditCard,
  RectangleHorizontal, Square, Smartphone, Presentation, Play,
  QrCode, FileText, PenTool, Palette,
};

export function BrandKitHub({ brand, slug }: BrandKitHubProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Brand Kit</h1>
        <p className="text-muted-foreground">
          Everything you need to build and maintain <span className="font-medium text-foreground">{brand.name}</span>'s visual identity.
        </p>
      </div>

      {/* Module Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {BRAND_KIT_MODULES.map((module) => {
          const Icon = iconMap[module.icon] || Settings;
          const isDisabled = module.comingSoon;

          return (
            <button
              key={module.id}
              onClick={() => !isDisabled && navigate(`/dashboard/brand/${slug}/brandkit/${module.id}`)}
              disabled={isDisabled}
              className={`group relative rounded-2xl p-5 text-left transition-all overflow-hidden ${
                isDisabled
                  ? 'opacity-40 cursor-not-allowed'
                  : 'hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] cursor-pointer'
              }`}
            >
              {/* Gradient Background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${module.gradient} opacity-90`} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

              {/* Content */}
              <div className="relative z-10 flex flex-col h-full min-h-[120px]">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="mt-auto">
                  <h3 className="text-white font-semibold text-sm mb-0.5">{module.name}</h3>
                  <p className="text-white/70 text-xs leading-relaxed">{module.description}</p>
                </div>
              </div>

              {/* Decorative shapes */}
              <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
              <div className="absolute -bottom-2 -left-2 w-12 h-12 rounded-full bg-white/5" />
            </button>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Brand Colors</p>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1">
              <div className="w-5 h-5 rounded-full border-2 border-white" style={{ backgroundColor: brand.primaryColor }} />
              {brand.secondaryColor && (
                <div className="w-5 h-5 rounded-full border-2 border-white" style={{ backgroundColor: brand.secondaryColor }} />
              )}
            </div>
            <span className="text-sm font-semibold">{brand.secondaryColor ? 2 : 1}</span>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Fonts</p>
          <p className="text-sm font-semibold">{brand.fonts.primary}{brand.fonts.secondary ? `, ${brand.fonts.secondary}` : ''}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Assets</p>
          <p className="text-sm font-semibold">{brand.assets?.length || 0} files</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Brand Tone</p>
          <p className="text-sm font-semibold truncate">{brand.tone || 'Not set'}</p>
        </div>
      </div>
    </div>
  );
}
