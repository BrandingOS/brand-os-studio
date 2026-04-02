import { Target, Eye, Heart, Compass, Users, Sparkles } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';

interface BrandStrategyModuleProps {
  brand: Brand;
}

export function BrandStrategyModule({ brand }: BrandStrategyModuleProps) {
  const strategy = brand.guidelines?.strategy;

  if (!strategy) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">Brand Strategy</h2>
          <p className="text-muted-foreground">Define your brand strategy in the guidelines to see it here.</p>
        </div>
        <div className="flex items-center justify-center py-20 border-2 border-dashed border-border rounded-xl">
          <div className="text-center">
            <Target className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No strategy defined</p>
          </div>
        </div>
      </div>
    );
  }

  const sections = [
    { icon: Target, label: 'Mission', content: strategy.mission, color: 'bg-blue-500' },
    { icon: Eye, label: 'Vision', content: strategy.vision, color: 'bg-purple-500' },
    { icon: Compass, label: 'Positioning', content: strategy.positioning, color: 'bg-indigo-500' },
    { icon: Users, label: 'Target Audience', content: strategy.targetAudience, color: 'bg-teal-500' },
  ].filter(s => s.content);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-1">Brand Strategy</h2>
        <p className="text-muted-foreground">{brand.name}'s strategic foundation — purpose, positioning, and audience.</p>
      </div>

      {/* Strategy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map(({ icon: Icon, label, content, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-7 h-7 rounded-lg ${color} flex items-center justify-center`}>
                  <Icon className="h-3.5 w-3.5 text-white" />
                </div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{label}</h3>
              </div>
              <p className="text-sm leading-relaxed">{content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Values */}
      {strategy.values && strategy.values.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Heart className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Core Values</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {strategy.values.map((value, i) => (
              <div key={value} className="rounded-xl border border-border bg-card p-4 text-center">
                <div className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: brand.primaryColor }}>
                  {i + 1}
                </div>
                <p className="text-sm font-medium">{value}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Personality */}
      {strategy.personality && strategy.personality.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Brand Personality</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {strategy.personality.map((trait) => (
              <span key={trait} className="px-4 py-2 rounded-xl text-sm font-medium bg-primary/5 text-primary border border-primary/10">
                {trait}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Brand Story / Strategy */}
      {brand.strategy && (
        <section className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-5 border-b border-border bg-muted/20">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Brand Story</h3>
          </div>
          <div className="p-5">
            <p className="text-sm leading-relaxed">{brand.strategy}</p>
          </div>
        </section>
      )}
    </div>
  );
}
