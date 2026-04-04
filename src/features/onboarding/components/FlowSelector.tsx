import { Sparkles, Upload, ArrowRight } from 'lucide-react';

export type OnboardingFlow = 'start-fresh' | 'import-brand';

interface FlowSelectorProps {
  onSelect: (flow: OnboardingFlow) => void;
}

const flows = [
  {
    id: 'start-fresh' as OnboardingFlow,
    title: 'Start Fresh',
    subtitle: 'New business, no existing brand',
    description:
      'We will guide you through building a brand identity from scratch — name, personality, colors, and more.',
    icon: Sparkles,
    gradient: 'from-violet-500/10 to-fuchsia-500/10',
    border: 'hover:border-violet-500/40',
    iconColor: 'text-violet-600 dark:text-violet-400',
  },
  {
    id: 'import-brand' as OnboardingFlow,
    title: 'Import Existing Brand',
    subtitle: 'Already have a logo and assets',
    description:
      'Upload your logo, brand guidelines, and colors. We will organize everything into a unified brand kit.',
    icon: Upload,
    gradient: 'from-sky-500/10 to-cyan-500/10',
    border: 'hover:border-sky-500/40',
    iconColor: 'text-sky-600 dark:text-sky-400',
  },
] as const;

export function FlowSelector({ onSelect }: FlowSelectorProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          Let's Build Your Brand
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg max-w-md mx-auto">
          Choose how you'd like to get started
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 max-w-2xl w-full">
        {flows.map((flow) => {
          const Icon = flow.icon;
          return (
            <button
              key={flow.id}
              type="button"
              onClick={() => onSelect(flow.id)}
              className={`group relative text-left p-6 sm:p-8 rounded-2xl border-2 border-border bg-gradient-to-br ${flow.gradient} ${flow.border} transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}
            >
              <div
                className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-background/80 border mb-5 ${flow.iconColor}`}
              >
                <Icon className="h-6 w-6" />
              </div>

              <h2 className="text-xl font-semibold mb-1">{flow.title}</h2>
              <p className="text-sm text-muted-foreground mb-3">
                {flow.subtitle}
              </p>
              <p className="text-sm text-muted-foreground/80 leading-relaxed">
                {flow.description}
              </p>

              <div className="mt-5 flex items-center gap-2 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Get started <ArrowRight className="h-4 w-4" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
