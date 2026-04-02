import { useState, useMemo } from 'react';
import { Download, Play, RotateCw } from 'lucide-react';
import { CategoryFilter } from './CategoryFilter';
import { BrandLogo } from './renderers/BrandLogo';
import { ANIMATIONS } from '../data/templates';
import type { Brand } from '@/shared/types/brand';
import type { AnimationConfig } from '../types';
import { toast } from 'sonner';

interface AnimationsModuleProps {
  brand: Brand;
}

const animationKeyframes: Record<string, string> = {
  slideInFromLeft: 'translateX(-100%) -> translateX(0)',
  fadeIn: 'opacity: 0 -> opacity: 1',
  scaleUp: 'scale(0.3) -> scale(1)',
  bounceIn: 'scale(0) -> scale(1.1) -> scale(1)',
  slideLoop: 'translateX(-20px) -> translateX(20px) -> translateX(-20px)',
  pulse: 'scale(1) -> scale(1.08) -> scale(1)',
  rotate360: 'rotate(0deg) -> rotate(360deg)',
  float: 'translateY(0) -> translateY(-8px) -> translateY(0)',
  slideOutRight: 'translateX(0) -> translateX(100%)',
  fadeOut: 'opacity: 1 -> opacity: 0',
  scaleDown: 'scale(1) -> scale(0.3)',
  zoomOut: 'scale(1) -> scale(0) opacity: 1 -> opacity: 0',
};

function AnimationPreview({ animation, brand, isPlaying }: { animation: AnimationConfig; brand: Brand; isPlaying: boolean }) {
  const cssMap: Record<string, React.CSSProperties> = {
    slideInFromLeft: isPlaying ? { animation: `slideInLeft ${animation.duration} ease-out forwards` } : {},
    fadeIn: isPlaying ? { animation: `fadeIn ${animation.duration} ease-out forwards` } : {},
    scaleUp: isPlaying ? { animation: `scaleUp ${animation.duration} ease-out forwards` } : {},
    bounceIn: isPlaying ? { animation: `bounceIn ${animation.duration} ease-out forwards` } : {},
    slideLoop: isPlaying ? { animation: `slideLoop ${animation.duration} ease-in-out infinite` } : {},
    pulse: isPlaying ? { animation: `pulse ${animation.duration} ease-in-out infinite` } : {},
    rotate360: isPlaying ? { animation: `spin ${animation.duration} linear infinite` } : {},
    float: isPlaying ? { animation: `float ${animation.duration} ease-in-out infinite` } : {},
    slideOutRight: isPlaying ? { animation: `slideOutRight ${animation.duration} ease-in forwards` } : {},
    fadeOut: isPlaying ? { animation: `fadeOut ${animation.duration} ease-in forwards` } : {},
    scaleDown: isPlaying ? { animation: `scaleDown ${animation.duration} ease-in forwards` } : {},
    zoomOut: isPlaying ? { animation: `zoomOut ${animation.duration} ease-in forwards` } : {},
  };

  return (
    <div
      className="flex items-center justify-center"
      style={cssMap[animation.cssAnimation] || {}}
    >
      <div className="flex flex-col items-center gap-1">
        <BrandLogo brand={brand} variant="monogram" size="lg" />
        <BrandLogo brand={brand} size="sm" />
      </div>
    </div>
  );
}

export function AnimationsModule({ brand }: AnimationsModuleProps) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [playingId, setPlayingId] = useState<string | null>(null);

  const categories = ['All', 'Looping', 'Intro', 'Outro'];

  const filteredAnimations = useMemo(() => {
    if (activeCategory === 'All') return ANIMATIONS;
    return ANIMATIONS.filter(a => a.type === activeCategory.toLowerCase());
  }, [activeCategory]);

  const handlePlay = (id: string) => {
    setPlayingId(null);
    setTimeout(() => setPlayingId(id), 50);
  };

  const handleDownload = (name: string) => {
    toast.success(`Downloading "${name}" animation`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Logo Animations</h2>
        <p className="text-muted-foreground">Preview and download animated versions of your logo.</p>
      </div>

      <CategoryFilter
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {filteredAnimations.map((animation) => (
          <div
            key={animation.id}
            className="rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-md hover:border-primary/20"
          >
            <div className="aspect-square flex items-center justify-center bg-muted/30 relative">
              <AnimationPreview
                animation={animation}
                brand={brand}
                isPlaying={playingId === animation.id}
              />
            </div>
            <div className="p-3">
              <p className="text-sm font-medium mb-0.5">{animation.name}</p>
              <p className="text-xs text-muted-foreground capitalize mb-3">{animation.type}</p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => handlePlay(animation.id)}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-muted text-xs font-medium hover:bg-muted/80 transition-colors"
                >
                  {playingId === animation.id ? <RotateCw className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  {playingId === animation.id ? 'Replay' : 'Play'}
                </button>
                <button
                  onClick={() => handleDownload(animation.name)}
                  className="flex items-center justify-center px-2 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  <Download className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { transform: scale(0.3); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes bounceIn {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes slideLoop {
          0%, 100% { transform: translateX(-15px); }
          50% { transform: translateX(15px); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes slideOutRight {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes scaleDown {
          from { transform: scale(1); opacity: 1; }
          to { transform: scale(0.3); opacity: 0; }
        }
        @keyframes zoomOut {
          from { transform: scale(1); opacity: 1; }
          to { transform: scale(0); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
