import { Check, X, MessageCircle, Quote, Lightbulb } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';

interface BrandVoiceModuleProps {
  brand: Brand;
}

export function BrandVoiceModule({ brand }: BrandVoiceModuleProps) {
  const voice = brand.guidelines?.voiceAndTone;
  const strategy = brand.guidelines?.strategy;

  if (!voice && !strategy) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">Brand Voice & Messaging</h2>
          <p className="text-muted-foreground">Define your brand's voice in the brand guidelines to see messaging rules here.</p>
        </div>
        <div className="flex items-center justify-center py-20 border-2 border-dashed border-border rounded-xl">
          <div className="text-center">
            <MessageCircle className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No voice guidelines defined</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Add voice & tone in your brand guidelines.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-1">Brand Voice & Messaging</h2>
        <p className="text-muted-foreground">How {brand.name} communicates — tone, style, and messaging rules.</p>
      </div>

      {/* Brand Voice Statement */}
      {voice?.brandVoice && (
        <section className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-5 border-b border-border bg-muted/20">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Brand Voice</h3>
          </div>
          <div className="p-5">
            <p className="text-base leading-relaxed">{voice.brandVoice}</p>
          </div>
        </section>
      )}

      {/* Tone Attributes */}
      {voice?.toneAttributes && voice.toneAttributes.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Tone Attributes</h3>
          <div className="flex flex-wrap gap-2">
            {voice.toneAttributes.map((attr) => (
              <span
                key={attr}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-border bg-card"
              >
                {attr}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Communication Style */}
      {voice?.communicationStyle && (
        <section className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-5 border-b border-border bg-muted/20">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Communication Style</h3>
          </div>
          <div className="p-5">
            <p className="text-sm leading-relaxed text-muted-foreground">{voice.communicationStyle}</p>
          </div>
        </section>
      )}

      {/* Do's and Don'ts */}
      {voice?.doAndDonts && (
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Writing Rules</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Do's */}
            <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20 overflow-hidden">
              <div className="px-4 py-3 border-b border-green-200 dark:border-green-800 flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm font-semibold text-green-700 dark:text-green-400">Do</span>
              </div>
              <div className="p-4 space-y-2">
                {voice.doAndDonts.do.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                    <span className="text-sm text-green-900 dark:text-green-200">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Don'ts */}
            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 overflow-hidden">
              <div className="px-4 py-3 border-b border-red-200 dark:border-red-800 flex items-center gap-2">
                <X className="h-4 w-4 text-red-500" />
                <span className="text-sm font-semibold text-red-700 dark:text-red-400">Don't</span>
              </div>
              <div className="p-4 space-y-2">
                {voice.doAndDonts.dont.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <X className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                    <span className="text-sm text-red-900 dark:text-red-200">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Examples */}
      {voice?.examples && voice.examples.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Copy Examples</h3>
          <div className="space-y-4">
            {voice.examples.map((example, i) => (
              <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center gap-2">
                  <Lightbulb className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{example.context}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                  <div className="p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Check className="h-3 w-3 text-green-500" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-green-600">Good</span>
                    </div>
                    <p className="text-sm text-foreground">{example.good}</p>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <X className="h-3 w-3 text-red-400" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-red-500">Bad</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{example.bad}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Brand Personality */}
      {strategy?.personality && strategy.personality.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Brand Personality</h3>
          <div className="flex flex-wrap gap-2">
            {strategy.personality.map((trait) => (
              <span key={trait} className="px-4 py-2 rounded-xl text-sm font-medium bg-primary/5 text-primary border border-primary/10">
                {trait}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
