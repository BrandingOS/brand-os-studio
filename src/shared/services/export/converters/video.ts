/**
 * Video Converter — MP4 from frame generator
 *
 * Extracted and generalized from AnimationsModule.tsx.
 * Supports configurable resolution (512/720/1080) and codec fallback.
 */
import type { ExportOptions, ExportResult, FrameGenerator } from '../types';

/**
 * Generate an MP4 (or WebM fallback) video from a frame generator.
 */
export async function framesToMP4(
  generator: FrameGenerator,
  options: ExportOptions,
  onProgress?: (pct: number) => void,
): Promise<ExportResult> {
  const size = options.resolution ?? 720;
  const fps = generator.fps;
  const totalFrames = generator.totalFrames;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Scale the generator's rendering to fit the output resolution
  const scaleX = size / generator.width;
  const scaleY = size / generator.height;

  // Try MP4 via VideoEncoder + mp4-muxer
  try {
    if (typeof globalThis.VideoEncoder === 'function') {
      const { Muxer, ArrayBufferTarget } = await import('mp4-muxer');

      const codecs = [
        { mux: 'avc', enc: 'avc1.42001f' },
        { mux: 'V_VP9', enc: 'vp09.00.10.08' },
      ];

      for (const { mux, enc } of codecs) {
        try {
          const support = await VideoEncoder.isConfigSupported({
            codec: enc,
            width: size,
            height: size,
            bitrate: 4_000_000,
            framerate: fps,
          });
          if (!support.supported) continue;

          const target = new ArrayBufferTarget();
          const muxer = new Muxer({
            target,
            video: { codec: mux as any, width: size, height: size },
            fastStart: 'in-memory',
          });

          const encoder = new VideoEncoder({
            output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
            error: () => {},
          });

          encoder.configure({
            codec: enc,
            width: size,
            height: size,
            bitrate: 4_000_000,
            framerate: fps,
          });

          for (let i = 0; i < totalFrames; i++) {
            ctx.save();
            ctx.scale(scaleX, scaleY);
            generator.renderFrame(ctx, i);
            ctx.restore();

            const vf = new VideoFrame(canvas, {
              timestamp: (i / fps) * 1e6,
              duration: (1 / fps) * 1e6,
            });
            encoder.encode(vf, { keyFrame: i % 60 === 0 });
            vf.close();
            onProgress?.(Math.round((i / totalFrames) * 90));
          }

          await encoder.flush();
          encoder.close();
          muxer.finalize();
          onProgress?.(100);

          return {
            blob: new Blob([target.buffer], { type: 'video/mp4' }),
            filename: `${options.filename}.mp4`,
            mimeType: 'video/mp4',
          };
        } catch {
          continue;
        }
      }
    }
  } catch {
    // Fall through to WebM
  }

  // Fallback: WebM via MediaRecorder (real-time)
  onProgress?.(0);
  const blob = await new Promise<Blob>((resolve, reject) => {
    const stream = canvas.captureStream(fps);
    const rec = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    rec.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
    rec.onerror = () => reject(new Error('MediaRecorder failed'));
    rec.start();

    let frame = 0;
    const interval = setInterval(() => {
      if (frame >= totalFrames) {
        clearInterval(interval);
        rec.stop();
        return;
      }
      ctx.save();
      ctx.scale(scaleX, scaleY);
      generator.renderFrame(ctx, frame);
      ctx.restore();
      onProgress?.(Math.round((frame / totalFrames) * 100));
      frame++;
    }, 1000 / fps);

    // Safety timeout
    setTimeout(() => {
      clearInterval(interval);
      if (rec.state === 'recording') rec.stop();
    }, 30000);
  });

  onProgress?.(100);
  return {
    blob,
    filename: `${options.filename}.webm`,
    mimeType: 'video/webm',
  };
}
