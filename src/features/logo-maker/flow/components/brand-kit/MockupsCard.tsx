import type { BrandContext } from '@/shared/services/mockup/registry';
import { MOCKUP_TEMPLATES } from '@/shared/services/mockup/registry';
import { KitCard } from './KitCard';

export function MockupsCard({ ctx }: { ctx: BrandContext }) {
  return (
    <KitCard title="Real-world mockups" meta={`${MOCKUP_TEMPLATES.length} scenes`}>
      <div className="grid grid-cols-2 gap-1.5">
        {MOCKUP_TEMPLATES.slice(0, 6).map((m) => {
          const Render = m.render;
          return (
            <div
              key={m.id}
              className="aspect-square rounded-md overflow-hidden border border-border bg-muted/30"
              title={m.label}
            >
              <Render ctx={ctx} />
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">
        {MOCKUP_TEMPLATES.length - 6} more in the full gallery — scroll below.
      </p>
    </KitCard>
  );
}

export function MockupsFullGallery({ ctx }: { ctx: BrandContext }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {MOCKUP_TEMPLATES.map((m) => {
        const Render = m.render;
        return (
          <div
            key={m.id}
            className="rounded-lg border border-border bg-card overflow-hidden"
          >
            <div className="aspect-[4/3] bg-muted/30">
              <Render ctx={ctx} />
            </div>
            <div className="px-3 py-2 border-t border-border flex items-center justify-between">
              <span className="text-xs font-medium">{m.label}</span>
              <span className="text-[10px] text-muted-foreground capitalize">{m.category}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
