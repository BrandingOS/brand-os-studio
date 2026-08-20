/**
 * Powered by world-class technology (ink) — the stack strip above the
 * Flow chapter. The owner's official brand files (wordmarks/lockups),
 * rendered via CSS mask so every mark takes the muted ink foreground,
 * drifting on the shared marquee loop, fading at both edges.
 *
 * `w`/`h` mirror each master's viewBox; `s` is a per-logo optical
 * scale so the row reads as one size despite different boxes.
 */
import { motion } from 'framer-motion';
import { ChapterHead, reveal } from './shared';
import { cssUrl } from '@/lib/cssUrl';
import openaiUrl from '@/assets/tech/openai.svg';
import anthropicUrl from '@/assets/tech/anthropic.svg';
import geminiUrl from '@/assets/tech/gemini.svg';
import ideogramUrl from '@/assets/tech/ideogram.svg';
import runwayUrl from '@/assets/tech/runway.svg';
import lumaUrl from '@/assets/tech/luma.svg';
import resendUrl from '@/assets/tech/resend.svg';
import supabaseUrl from '@/assets/tech/supabase.svg';
import cloudflareUrl from '@/assets/tech/cloudflare.svg';

const MASK = (url: string): React.CSSProperties => ({
  display: 'inline-block',
  WebkitMaskImage: cssUrl(url),
  maskImage: cssUrl(url),
  WebkitMaskSize: 'contain',
  maskSize: 'contain',
  WebkitMaskRepeat: 'no-repeat',
  maskRepeat: 'no-repeat',
  WebkitMaskPosition: 'center',
  maskPosition: 'center',
});

function Mark({
  name,
  url,
  w,
  h,
  s,
  dy = 0,
}: {
  name: string;
  url: string;
  w: number;
  h: number;
  s: number;
  /** optical vertical nudge in px (negative = up) */
  dy?: number;
}) {
  return (
    <span
      role="img"
      aria-label={name}
      className="shrink-0 bg-current"
      style={{ ...MASK(url), height: `${Math.round(26 * s)}px`, aspectRatio: `${w} / ${h}`, transform: dy ? `translateY(${dy}px)` : undefined }}
    />
  );
}

function RowMarks() {
  return (
    <>
      <Mark name="OpenAI" url={openaiUrl} w={1180} h={320} s={1} />
      <Mark name="Anthropic" url={anthropicUrl} w={1024.2} h={115} s={0.78} />
      <Mark name="Google Gemini" url={geminiUrl} w={288} h={65} s={1.05} />
      {/* Recraft is deliberately absent: src/assets/tech/recraft.svg is a
          broken export — its glyphs overlap and cancel, so it renders as a
          smear as an <img> too, not only through the mask. Put a correct
          wordmark at that path and add the Mark back with its viewBox. */}
      <Mark name="Ideogram" url={ideogramUrl} w={497} h={100} s={1} />
      <Mark name="Runway" url={runwayUrl} w={138.408} h={27} s={0.96} />
      <Mark name="Luma" url={lumaUrl} w={456} h={105.35} s={1} />
      <Mark name="Resend" url={resendUrl} w={1978} h={420} s={0.95} />
      <Mark name="Supabase" url={supabaseUrl} w={581} h={113} s={1.05} />
      <Mark name="Cloudflare" url={cloudflareUrl} w={101.4} h={33.5} s={1.7} dy={-5} />
    </>
  );
}

export function PoweredBy() {
  const fade =
    'linear-gradient(to right, transparent, black 12%, black 88%, transparent)';
  return (
    <section
      aria-label="Powered by world-class technology"
      className="overflow-hidden bg-panel text-panel-foreground"
    >
      <div className="py-[9vh]">
        <div className="container-tight">
          <ChapterHead label="Powered by world-class technology" />
        </div>

        <motion.div
          {...reveal}
          className="mt-12 overflow-hidden text-panel-foreground/50"
          style={{ WebkitMaskImage: fade, maskImage: fade }}
        >
          <div className="marquee-track flex w-max" style={{ animationDuration: '40s' }}>
            {[0, 1].map((dup) => (
              <div
                key={dup}
                className="flex shrink-0 items-center gap-20 pr-20 md:gap-28 md:pr-28"
                aria-hidden={dup === 1}
              >
                <RowMarks />
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
