import { useState, useMemo, useCallback } from 'react';
import { Download, Play, RotateCw, Film } from 'lucide-react';
import { CategoryFilter } from './CategoryFilter';
import { BrandLogo } from './renderers/BrandLogo';
import { ANIMATIONS } from '../data/templates';
import type { Brand } from '@/shared/types/brand';
import type { AnimationConfig } from '../types';
import { toast } from 'sonner';

interface AnimationsModuleProps {
  brand: Brand;
}

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

// ─── Animation math ────────────────────────────────────────────

type AnimFn = (t: number) => { x: number; y: number; scale: number; opacity: number; rotation: number };

const animFns: Record<string, AnimFn> = {
  slideInFromLeft: (t) => ({ x: -(1 - t), y: 0, scale: 1, opacity: t, rotation: 0 }),
  fadeIn: (t) => ({ x: 0, y: 0, scale: 1, opacity: t, rotation: 0 }),
  scaleUp: (t) => ({ x: 0, y: 0, scale: 0.3 + 0.7 * t, opacity: t, rotation: 0 }),
  bounceIn: (t) => ({ x: 0, y: 0, scale: t < 0.6 ? (t / 0.6) * 1.15 : 1.15 - ((t - 0.6) / 0.4) * 0.15, opacity: Math.min(1, t * 2), rotation: 0 }),
  slideLoop: (t) => ({ x: Math.sin(t * Math.PI * 2) * 0.1, y: 0, scale: 1, opacity: 1, rotation: 0 }),
  pulse: (t) => ({ x: 0, y: 0, scale: 1 + 0.08 * Math.sin(t * Math.PI * 2), opacity: 1, rotation: 0 }),
  rotate360: (t) => ({ x: 0, y: 0, scale: 1, opacity: 1, rotation: t * 360 }),
  float: (t) => ({ x: 0, y: Math.sin(t * Math.PI * 2) * -0.04, scale: 1, opacity: 1, rotation: 0 }),
  slideOutRight: (t) => ({ x: t, y: 0, scale: 1, opacity: 1 - t, rotation: 0 }),
  fadeOut: (t) => ({ x: 0, y: 0, scale: 1, opacity: 1 - t, rotation: 0 }),
  scaleDown: (t) => ({ x: 0, y: 0, scale: 1 - 0.7 * t, opacity: 1 - t, rotation: 0 }),
  zoomOut: (t) => ({ x: 0, y: 0, scale: 1 - t, opacity: 1 - t, rotation: 0 }),
};

function renderFrame(ctx: CanvasRenderingContext2D, size: number, t: number, fn: AnimFn, logoImg: HTMLImageElement | null, brand: Brand) {
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  const { x, y, scale, opacity, rotation } = fn(t);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
  ctx.translate(size / 2 + x * size, size / 2 + y * size);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(scale, scale);
  if (logoImg) {
    const w = size * 0.5;
    const h = (logoImg.height / logoImg.width) * w;
    ctx.drawImage(logoImg, -w / 2, -h / 2, w, h);
  } else {
    ctx.fillStyle = brand.primaryColor;
    ctx.font = `bold ${size * 0.2}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(brand.name.charAt(0), 0, 0);
  }
  ctx.restore();
}

// ─── MP4 export using VideoEncoder + mp4-muxer ─────────────────

async function exportMP4(
  animation: AnimationConfig,
  brand: Brand,
  logoImg: HTMLImageElement | null,
  onProgress: (pct: number) => void,
): Promise<Blob> {
  const { Muxer, ArrayBufferTarget } = await import('mp4-muxer');

  const size = 512;
  const fps = 30;
  const durationSec = parseFloat(animation.duration);
  const isLooping = animation.type === 'looping';
  const holdSec = 2;
  const totalSec = isLooping ? durationSec * 3 : durationSec + holdSec;
  const totalFrames = Math.round(totalSec * fps);
  const fn = animFns[animation.cssAnimation] || animFns.fadeIn;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: {
      codec: 'V_VP9',
      width: size,
      height: size,
    },
    fastStart: 'in-memory',
  });

  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => console.error('Encoder error:', e),
  });

  encoder.configure({
    codec: 'vp09.00.10.08',
    width: size,
    height: size,
    bitrate: 4_000_000,
    framerate: fps,
  });

  for (let i = 0; i < totalFrames; i++) {
    const elapsed = i / fps;
    const t = isLooping
      ? (elapsed / durationSec) % 1
      : Math.min(elapsed / durationSec, 1);

    renderFrame(ctx, size, t, fn, logoImg, brand);

    const frame = new VideoFrame(canvas, {
      timestamp: (i / fps) * 1_000_000, // microseconds
      duration: (1 / fps) * 1_000_000,
    });
    encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
    frame.close();

    onProgress(Math.round((i / totalFrames) * 90));
  }

  await encoder.flush();
  encoder.close();
  muxer.finalize();

  onProgress(100);
  return new Blob([target.buffer], { type: 'video/mp4' });
}

// ─── Fallback: WebM via MediaRecorder ──────────────────────────

async function exportWebM(
  animation: AnimationConfig,
  brand: Brand,
  logoImg: HTMLImageElement | null,
): Promise<Blob> {
  const size = 512;
  const fn = animFns[animation.cssAnimation] || animFns.fadeIn;
  const durationMs = parseFloat(animation.duration) * 1000;
  const isLooping = animation.type === 'looping';
  const totalMs = isLooping ? durationMs * 3 : durationMs + 2000;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  return new Promise((resolve, reject) => {
    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
    recorder.onerror = () => reject(new Error('Recording failed'));
    recorder.start();

    const start = performance.now();
    function draw() {
      const elapsed = performance.now() - start;
      if (elapsed >= totalMs) { recorder.stop(); return; }
      const t = isLooping ? (elapsed / durationMs) % 1 : Math.min(elapsed / durationMs, 1);
      renderFrame(ctx, size, t, fn, logoImg, brand);
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
    setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, 15000);
  });
}

// ─── Component ─────────────────────────────────────────────────

export function AnimationsModule({ brand }: AnimationsModuleProps) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const categories = ['All', 'Looping', 'Intro', 'Outro'];

  const filteredAnimations = useMemo(() => {
    if (activeCategory === 'All') return ANIMATIONS;
    return ANIMATIONS.filter(a => a.type === activeCategory.toLowerCase());
  }, [activeCategory]);

  const handlePlay = (id: string) => {
    setPlayingId(null);
    setTimeout(() => setPlayingId(id), 50);
  };

  const handleDownloadVideo = useCallback(async (animation: AnimationConfig) => {
    setExportingId(animation.id);
    setProgress(0);
    setPlayingId(animation.id);

    let logoImg: HTMLImageElement | null = null;
    if (brand.logo) {
      logoImg = await new Promise<HTMLImageElement>((res, rej) => {
        const img = new Image(); img.crossOrigin = 'anonymous';
        img.onload = () => res(img); img.onerror = rej; img.src = brand.logo!;
      }).catch(() => null);
    }

    const slug = brand.slug || brand.name.toLowerCase().replace(/\s+/g, '-');

    try {
      // Try modern VideoEncoder API first (produces real MP4)
      if (typeof VideoEncoder !== 'undefined') {
        const blob = await exportMP4(animation, brand, logoImg, setProgress);
        downloadBlob(blob, `${slug}-${animation.id}.mp4`);
        toast.success('Video downloaded (.mp4)');
      } else {
        // Fallback to WebM
        const blob = await exportWebM(animation, brand, logoImg);
        downloadBlob(blob, `${slug}-${animation.id}.webm`);
        toast.success('Video downloaded (.webm)');
      }
    } catch (err) {
      console.error('Export error:', err);
      // Last resort fallback
      try {
        const blob = await exportWebM(animation, brand, logoImg);
        downloadBlob(blob, `${slug}-${animation.id}.webm`);
        toast.success('Video downloaded (.webm)');
      } catch {
        toast.error('Video export failed');
      }
    } finally {
      setExportingId(null);
      setProgress(0);
    }
  }, [brand]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Logo Animations</h2>
        <p className="text-muted-foreground">Preview and download animated logo videos.</p>
      </div>

      <CategoryFilter categories={categories} activeCategory={activeCategory} onCategoryChange={setActiveCategory} />

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {filteredAnimations.map((animation) => {
          const busy = exportingId === animation.id;
          return (
            <div key={animation.id} className="rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-md hover:border-primary/20">
              <div className="aspect-square flex items-center justify-center bg-muted/30">
                <AnimationPreview animation={animation} brand={brand} isPlaying={playingId === animation.id} />
              </div>
              <div className="p-3">
                <p className="text-sm font-medium mb-0.5">{animation.name}</p>
                <p className="text-xs text-muted-foreground capitalize mb-3">{animation.type}</p>
                <div className="space-y-1.5">
                  <button onClick={() => handlePlay(animation.id)} className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-muted text-xs font-medium hover:bg-muted/80 transition-colors">
                    {playingId === animation.id ? <RotateCw className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    {playingId === animation.id ? 'Replay' : 'Play'}
                  </button>
                  <button
                    onClick={() => handleDownloadVideo(animation)}
                    disabled={busy}
                    className="w-full flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {busy ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {progress > 0 ? `${progress}%` : 'Preparing...'}
                      </>
                    ) : (
                      <>
                        <Film className="h-3.5 w-3.5" />
                        Download Video
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes slideInLeft { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUp { from { transform: scale(0.3); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes bounceIn { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); } }
        @keyframes slideLoop { 0%, 100% { transform: translateX(-15px); } 50% { transform: translateX(15px); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes scaleDown { from { transform: scale(1); opacity: 1; } to { transform: scale(0.3); opacity: 0; } }
        @keyframes zoomOut { from { transform: scale(1); opacity: 1; } to { transform: scale(0); opacity: 0; } }
      `}</style>
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
