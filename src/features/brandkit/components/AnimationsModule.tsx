import { useState, useMemo, useCallback, useRef } from 'react';
import { Download, Play, RotateCw, Film, Layers } from 'lucide-react';
import { CategoryFilter } from './CategoryFilter';
import { BrandLogo } from './renderers/BrandLogo';
import { ANIMATIONS } from '../data/templates';
import type { Brand } from '@/shared/types/brand';
import type { AnimationConfig } from '../types';
import { toast } from 'sonner';

interface AnimationsModuleProps {
  brand: Brand;
}

// ─── Animation CSS map ─────────────────────────────────────────

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
    <div className="flex items-center justify-center" style={cssMap[animation.cssAnimation] || {}}>
      <div className="flex flex-col items-center gap-1">
        <BrandLogo brand={brand} variant="monogram" size="lg" />
        <BrandLogo brand={brand} size="sm" />
      </div>
    </div>
  );
}

// ─── Video Recording via Canvas + MediaRecorder ────────────────

async function recordAnimationVideo(
  animation: AnimationConfig,
  brand: Brand,
  alpha: boolean,
): Promise<Blob> {
  const size = 512;
  const fps = 30;
  const durationMs = parseFloat(animation.duration) * 1000;
  const isLooping = animation.type === 'looping';
  const totalMs = isLooping ? Math.max(durationMs * 2, 3000) : durationMs + 500;
  const totalFrames = Math.ceil((totalMs / 1000) * fps);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Load logo image
  let logoImg: HTMLImageElement | null = null;
  if (brand.logo) {
    logoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = brand.logo!;
    }).catch(() => null);
  }

  // Animation functions — return transform for a given progress (0-1)
  type AnimFn = (t: number) => { x: number; y: number; scale: number; opacity: number; rotation: number };

  const animFns: Record<string, AnimFn> = {
    slideInFromLeft: (t) => ({ x: -size * (1 - t), y: 0, scale: 1, opacity: t, rotation: 0 }),
    fadeIn: (t) => ({ x: 0, y: 0, scale: 1, opacity: t, rotation: 0 }),
    scaleUp: (t) => ({ x: 0, y: 0, scale: 0.3 + 0.7 * t, opacity: t, rotation: 0 }),
    bounceIn: (t) => {
      const s = t < 0.6 ? (t / 0.6) * 1.15 : 1.15 - (t - 0.6) / 0.4 * 0.15;
      return { x: 0, y: 0, scale: Math.max(0, s), opacity: Math.min(1, t * 2), rotation: 0 };
    },
    slideLoop: (t) => ({ x: Math.sin(t * Math.PI * 2) * 30, y: 0, scale: 1, opacity: 1, rotation: 0 }),
    pulse: (t) => ({ x: 0, y: 0, scale: 1 + 0.08 * Math.sin(t * Math.PI * 2), opacity: 1, rotation: 0 }),
    rotate360: (t) => ({ x: 0, y: 0, scale: 1, opacity: 1, rotation: t * 360 }),
    float: (t) => ({ x: 0, y: Math.sin(t * Math.PI * 2) * -10, scale: 1, opacity: 1, rotation: 0 }),
    slideOutRight: (t) => ({ x: size * t, y: 0, scale: 1, opacity: 1 - t, rotation: 0 }),
    fadeOut: (t) => ({ x: 0, y: 0, scale: 1, opacity: 1 - t, rotation: 0 }),
    scaleDown: (t) => ({ x: 0, y: 0, scale: 1 - 0.7 * t, opacity: 1 - t, rotation: 0 }),
    zoomOut: (t) => ({ x: 0, y: 0, scale: 1 - t, opacity: 1 - t, rotation: 0 }),
  };

  const animFn = animFns[animation.cssAnimation] || animFns.fadeIn;

  // Record using MediaRecorder
  const stream = canvas.captureStream(fps);
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  const recordingDone = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
  });

  recorder.start();

  // Render frames
  for (let frame = 0; frame < totalFrames; frame++) {
    const rawT = frame / totalFrames;
    const t = isLooping ? rawT % 1 : Math.min(rawT * (totalMs / durationMs), 1);
    const { x, y, scale, opacity, rotation } = animFn(t);

    ctx.clearRect(0, 0, size, size);

    if (!alpha) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
    }

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
    ctx.translate(size / 2 + x, size / 2 + y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);

    if (logoImg) {
      const logoW = size * 0.5;
      const logoH = (logoImg.height / logoImg.width) * logoW;
      ctx.drawImage(logoImg, -logoW / 2, -logoH / 2, logoW, logoH);
    } else {
      // Fallback: draw brand initial
      ctx.fillStyle = brand.primaryColor;
      ctx.font = `bold ${size * 0.25}px ${brand.fonts?.primary || 'Inter'}, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(brand.name.charAt(0), 0, 0);
    }

    ctx.restore();

    // Wait for next frame
    await new Promise(r => setTimeout(r, 1000 / fps));
  }

  recorder.stop();
  return recordingDone;
}

// ─── Main Component ────────────────────────────────────────────

export function AnimationsModule({ brand }: AnimationsModuleProps) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [recordingId, setRecordingId] = useState<string | null>(null);

  const categories = ['All', 'Looping', 'Intro', 'Outro'];

  const filteredAnimations = useMemo(() => {
    if (activeCategory === 'All') return ANIMATIONS;
    return ANIMATIONS.filter(a => a.type === activeCategory.toLowerCase());
  }, [activeCategory]);

  const handlePlay = (id: string) => {
    setPlayingId(null);
    setTimeout(() => setPlayingId(id), 50);
  };

  const handleDownloadVideo = useCallback(async (animation: AnimationConfig, alpha: boolean) => {
    setRecordingId(animation.id);
    try {
      const blob = await recordAnimationVideo(animation, brand, alpha);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const slug = brand.slug || brand.name.toLowerCase().replace(/\s+/g, '-');
      const suffix = alpha ? 'alpha' : 'video';
      a.href = url;
      a.download = `${slug}-${animation.id}-${suffix}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded "${animation.name}" as ${alpha ? 'alpha' : 'normal'} video`);
    } catch (err) {
      console.error('Recording failed:', err);
      toast.error('Video recording failed');
    } finally {
      setRecordingId(null);
    }
  }, [brand]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Logo Animations</h2>
        <p className="text-muted-foreground">Preview and download animated versions of your logo as video.</p>
      </div>

      <CategoryFilter
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {filteredAnimations.map((animation) => {
          const isRecording = recordingId === animation.id;
          return (
            <div
              key={animation.id}
              className="rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-md hover:border-primary/20"
            >
              <div className="aspect-square flex items-center justify-center bg-muted/30 relative">
                <AnimationPreview animation={animation} brand={brand} isPlaying={playingId === animation.id} />
                {isRecording && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="flex items-center gap-2 text-white text-xs font-medium">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      Recording...
                    </div>
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium mb-0.5">{animation.name}</p>
                <p className="text-xs text-muted-foreground capitalize mb-3">{animation.type}</p>
                <div className="space-y-1.5">
                  {/* Play button */}
                  <button
                    onClick={() => handlePlay(animation.id)}
                    className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-muted text-xs font-medium hover:bg-muted/80 transition-colors"
                  >
                    {playingId === animation.id ? <RotateCw className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    {playingId === animation.id ? 'Replay' : 'Play'}
                  </button>
                  {/* Download buttons */}
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleDownloadVideo(animation, false)}
                      disabled={isRecording}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                      title="Download as video with white background"
                    >
                      <Film className="h-3 w-3" />
                      Video
                    </button>
                    <button
                      onClick={() => handleDownloadVideo(animation, true)}
                      disabled={isRecording}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
                      title="Download as video with transparent background (alpha)"
                    >
                      <Layers className="h-3 w-3" />
                      Alpha
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
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
