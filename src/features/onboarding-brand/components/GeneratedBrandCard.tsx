import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Check, Sparkles } from 'lucide-react';
import { loadFontFamily } from '@/shared/design-system/fonts';
import type { GeneratedBrand } from '../types';
import { Reveal, StaggerDots } from './BrandRevealAnimation';

interface GeneratedBrandCardProps {
  brand: GeneratedBrand;
  onShuffle: () => void;
  onAccept: () => void;
  isShuffling?: boolean;
}

export function GeneratedBrandCard({
  brand,
  onShuffle,
  onAccept,
  isShuffling,
}: GeneratedBrandCardProps) {
  useEffect(() => {
    loadFontFamily(brand.fonts.heading);
    loadFontFamily(brand.fonts.body);
  }, [brand.fonts.heading, brand.fonts.body]);

  const paletteDots = useMemo(
    () => [
      brand.colors.primary,
      brand.colors.secondary,
      brand.colors.accent,
      ...brand.colors.neutrals,
    ],
    [brand],
  );

  return (
    <motion.div
      key={`${brand.name}-${brand.colors.primary}`}
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.98 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-2xl mx-auto rounded-3xl border border-border bg-card shadow-xl overflow-hidden"
    >
      <div
        className="relative px-8 pt-10 pb-8 text-center"
        style={{
          background: `linear-gradient(180deg, ${brand.colors.primary}18 0%, transparent 100%)`,
        }}
      >
        <Reveal delay={0.05}>
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mb-5"
            style={{
              background: `${brand.colors.primary}22`,
              color: brand.colors.primary,
            }}
          >
            <Sparkles className="w-3 h-3" />
            {brand.personality.visualStyle} · {brand.logoConcept.style}
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <h2
            className="text-5xl md:text-6xl font-bold tracking-tight mb-3"
            style={{ fontFamily: `'${brand.fonts.heading}', sans-serif` }}
          >
            {brand.name}
          </h2>
        </Reveal>

        <Reveal delay={0.25}>
          <p
            className="text-lg text-muted-foreground max-w-md mx-auto"
            style={{ fontFamily: `'${brand.fonts.body}', sans-serif` }}
          >
            {brand.tagline}
          </p>
        </Reveal>
      </div>

      <div className="px-8 pb-8 space-y-7">
        <Reveal delay={0.35}>
          <Section label="Colors">
            <StaggerDots colors={paletteDots} delay={0.4} />
          </Section>
        </Reveal>

        <Reveal delay={0.55}>
          <Section label="Typography">
            <div className="flex items-baseline gap-4 flex-wrap">
              <span
                className="text-2xl font-semibold"
                style={{ fontFamily: `'${brand.fonts.heading}', sans-serif` }}
              >
                {brand.fonts.heading}
              </span>
              <span className="text-muted-foreground text-sm">+</span>
              <span
                className="text-lg"
                style={{ fontFamily: `'${brand.fonts.body}', sans-serif` }}
              >
                {brand.fonts.body}
              </span>
              <span className="text-xs text-muted-foreground">
                · {brand.fonts.style}
              </span>
            </div>
          </Section>
        </Reveal>

        <Reveal delay={0.7}>
          <Section label="Voice">
            <div className="flex flex-wrap gap-2">
              {brand.voice.traits.map((trait) => (
                <span
                  key={trait}
                  className="px-2.5 py-1 rounded-full text-xs bg-muted text-foreground"
                >
                  {trait}
                </span>
              ))}
              <span className="px-2.5 py-1 rounded-full text-xs border border-border text-muted-foreground">
                {brand.voice.tone}
              </span>
            </div>
          </Section>
        </Reveal>

        <Reveal delay={0.85}>
          <Section label="Audience">
            <p className="text-sm text-foreground/80">
              {brand.audience.shortDescription}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {brand.audience.ageRange} · {brand.audience.pricePoint}
            </p>
          </Section>
        </Reveal>

        <Reveal delay={1}>
          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onShuffle}
              disabled={isShuffling}
              className="flex-1 h-12 rounded-xl border border-border bg-background hover:bg-muted transition-colors inline-flex items-center justify-center gap-2 font-medium text-sm disabled:opacity-60"
            >
              <RefreshCw
                className={`w-4 h-4 ${isShuffling ? 'animate-spin' : ''}`}
              />
              Shuffle this one
            </button>
            <button
              type="button"
              onClick={onAccept}
              className="flex-1 h-12 rounded-xl font-medium text-sm inline-flex items-center justify-center gap-2 text-white hover:scale-[1.02] active:scale-95 transition-transform shadow-md"
              style={{ background: brand.colors.primary }}
            >
              <Check className="w-4 h-4" />
              I love it
            </button>
          </div>
        </Reveal>
      </div>
    </motion.div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold mb-2">
        {label}
      </div>
      {children}
    </div>
  );
}
