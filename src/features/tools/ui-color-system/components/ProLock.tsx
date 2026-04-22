/**
 * ProLock — the single canonical upgrade prompt for the tool.
 *
 * We only render one of these per page. Inline lock chips (on individual
 * role rows) link to this banner rather than spawning their own modals.
 * That keeps the "buy me!" pressure low and the UX calm.
 */
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ProLock({
  headline = 'Unlock the full color system',
  body = 'Secondary & tertiary scales, semantics, APCA, image extraction, advanced exports, save & share.',
  cta = 'Upgrade',
  href = '/pricing',
}: {
  headline?: string;
  body?: string;
  cta?: string;
  href?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/5 via-background to-background p-4 shadow-sm">
      <div className="pointer-events-none absolute -top-8 -right-8 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
      <div className="relative flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">{headline}</p>
            <p className="text-xs text-muted-foreground">{body}</p>
          </div>
        </div>
        <Button asChild size="sm" className="gap-1.5 self-stretch sm:self-auto">
          <a href={href}>
            {cta}
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    </div>
  );
}
