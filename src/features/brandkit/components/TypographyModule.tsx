import { Type } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';

interface TypographyModuleProps {
  brand: Brand;
}

export function TypographyModule({ brand }: TypographyModuleProps) {
  const typo = brand.guidelines?.typography;
  const primaryFont = typo?.primary?.family || brand.fonts.primary;
  const secondaryFont = typo?.secondary?.family || brand.fonts.secondary;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-1">Typography</h2>
        <p className="text-muted-foreground">Font families, hierarchy, and usage rules for {brand.name}.</p>
      </div>

      {/* Font Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-5 border-b border-border bg-muted/20">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Primary Typeface</h3>
          </div>
          <div className="p-6">
            <p className="text-3xl font-bold mb-2" style={{ fontFamily: primaryFont }}>
              {primaryFont}
            </p>
            <p className="text-sm text-muted-foreground mb-4" style={{ fontFamily: primaryFont }}>
              {typo?.primary?.usage || `Used for UI text, body content, and interface elements.`}
            </p>
            <div className="space-y-1 text-sm" style={{ fontFamily: primaryFont }}>
              <p className="font-normal">Regular 400 — The quick brown fox jumps over the lazy dog</p>
              <p className="font-medium">Medium 500 — The quick brown fox jumps over the lazy dog</p>
              <p className="font-semibold">SemiBold 600 — The quick brown fox jumps over the lazy dog</p>
              <p className="font-bold">Bold 700 — The quick brown fox jumps over the lazy dog</p>
            </div>
          </div>
        </div>

        {secondaryFont && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="p-5 border-b border-border bg-muted/20">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Secondary Typeface</h3>
            </div>
            <div className="p-6">
              <p className="text-3xl font-bold mb-2" style={{ fontFamily: secondaryFont }}>
                {secondaryFont}
              </p>
              <p className="text-sm text-muted-foreground mb-4" style={{ fontFamily: secondaryFont }}>
                {typo?.secondary?.usage || `Used for headlines, marketing, and brand communications.`}
              </p>
              <div className="space-y-1 text-sm" style={{ fontFamily: secondaryFont }}>
                <p className="font-medium">Medium 500 — The quick brown fox jumps over the lazy dog</p>
                <p className="font-semibold">SemiBold 600 — The quick brown fox jumps over the lazy dog</p>
                <p className="font-bold">Bold 700 — The quick brown fox jumps over the lazy dog</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Type Scale */}
      {typo?.scale && (
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Type Scale</h3>
          <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
            {Object.entries(typo.scale).map(([key, value]) => {
              const [size] = value.split('/');
              return (
                <div key={key} className="flex items-center gap-4 px-5 py-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-20 shrink-0">{key}</span>
                  <span style={{ fontSize: size, fontFamily: key.startsWith('h') ? secondaryFont || primaryFont : primaryFont, fontWeight: key.startsWith('h') ? 600 : 400 }}>
                    {brand.name}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto font-mono shrink-0">{value}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Hierarchy */}
      {typo?.hierarchy && (
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Hierarchy Rules</h3>
          <div className="space-y-3">
            {['headings', 'body', 'ui'].map((group) => {
              const rules = typo.hierarchy[group as keyof typeof typo.hierarchy];
              if (!rules || rules.length === 0) return null;
              return (
                <div key={group} className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-border bg-muted/20">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground capitalize">{group}</span>
                  </div>
                  <div className="divide-y divide-border">
                    {rules.map((rule) => (
                      <div key={rule.element} className="px-4 py-3 flex items-center gap-4">
                        <span className="text-sm font-semibold w-24 shrink-0" style={{ fontSize: rule.fontSize, lineHeight: '1.2', fontWeight: rule.fontWeight }}>
                          Aa
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{rule.element}</p>
                          <p className="text-xs text-muted-foreground">{rule.usage}</p>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground ml-auto shrink-0">
                          {rule.fontSize} / {rule.fontWeight}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
