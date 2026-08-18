/**
 * WorkspaceHero — the v5 portal hero on the workspace home.
 *
 * Frontify-portal vibe: a wide branded surface with a quiet aurora gradient,
 * a clear identity ("Your workspace"), one primary action (Create), and
 * supporting affordances for ⌘K + AI assistant.
 */
import * as React from 'react';
import { useCommandPalette } from '@/shared/search/CommandPaletteProvider';
import { useBrandAssistant } from '@/features/ai/v5/BrandAssistantProvider';
import { useSessionStore } from '@/shared/store/sessionStore';
import { Plus, Search, Sparkles, ArrowRight } from 'lucide-react';

interface WorkspaceHeroProps {
  brandsCount: number;
  onCreateBrand: () => void;
  mode?: 'user' | 'guest';
}

export function WorkspaceHero({ brandsCount, onCreateBrand, mode }: WorkspaceHeroProps) {
  const { setOpen: openPalette } = useCommandPalette();
  const { setOpen: openAssistant } = useBrandAssistant();
  const user = useSessionStore((s) => s.user);
  const greeting = React.useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const firstName = (user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there')
    .split(' ')[0]
    .replace(/[^a-zA-Z]/g, '');

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-card">
      {/* Aurora layer */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-primary/30 blur-[120px]" />
        <div className="absolute -right-20 top-12 h-[360px] w-[360px] rounded-full bg-accent/25 blur-[120px]" />
        <div className="absolute bottom-[-180px] left-1/3 h-[300px] w-[600px] rounded-full bg-primary/20 blur-[140px]" />
      </div>

      {/* Grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative px-8 py-12 md:px-12 md:py-16">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground backdrop-blur">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              BrandingOS · Workspace
            </p>
            <h1 className="font-display text-4xl font-bold tracking-[-0.03em] text-foreground md:text-5xl lg:text-6xl">
              {greeting}, {firstName}.
            </h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              {brandsCount === 0
                ? 'Let\'s build your first brand. From logo to guidelines to a public portal — in one place.'
                : `You have ${brandsCount} brand${brandsCount === 1 ? '' : 's'} under management. Pick up where you left off, or start something new.`}
            </p>

            {/* Actions */}
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onCreateBrand}
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[0_10px_40px_-12px_hsl(var(--primary)/0.7)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_-12px_hsl(var(--primary)/0.85)]"
              >
                <Plus className="h-4 w-4" />
                Create brand
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </button>
              <button
                type="button"
                onClick={() => openPalette(true)}
                className="group inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-4 py-3 text-sm font-medium text-foreground backdrop-blur transition hover:border-primary/40 hover:bg-background/70"
              >
                <Search className="h-4 w-4 text-muted-foreground" />
                Search everything
                <kbd className="ml-1 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  ⌘K
                </kbd>
              </button>
              <button
                type="button"
                onClick={() => openAssistant(true)}
                className="group inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-4 py-3 text-sm font-medium text-foreground backdrop-blur transition hover:border-primary/40 hover:bg-background/70"
              >
                <Sparkles className="h-4 w-4 text-primary" />
                Ask AI
                <kbd className="ml-1 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  ⌘J
                </kbd>
              </button>
            </div>

            {mode === 'guest' && (
              <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-medium text-amber-300">
                Guest mode · 1 brand limit · Sign up to unlock
              </p>
            )}
          </div>

          {/* Decorative metric stack */}
          <div className="hidden md:flex md:flex-col md:items-end md:gap-2">
            <div className="rounded-2xl border border-border bg-background/40 px-5 py-4 backdrop-blur">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Brands</div>
              <div className="mt-1 font-display text-3xl font-bold text-foreground">{brandsCount}</div>
            </div>
            <div className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              ⌘K · search · ⌘J · ask
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
