import type { BrandContext } from '@/shared/services/mockup/registry';
import { LogoSlot } from '@/shared/services/mockup/shared';
import { KitCard } from './KitCard';

interface LogoVariationsCardProps {
  ctx: BrandContext;
}

export function LogoVariationsCard({ ctx }: LogoVariationsCardProps) {
  const variants = [
    { id: 'primary', label: 'Primary', bg: '#ffffff' },
    { id: 'dark', label: 'Dark BG', bg: ctx.secondaryColor },
    { id: 'mono-black', label: 'Mono black', bg: '#ffffff', forceFill: '#111' },
    { id: 'favicon', label: 'Favicon', bg: ctx.primaryColor, size: 'sm' as const },
  ];

  return (
    <KitCard
      title="Logo variations"
      meta={`${variants.length} variants · SVG · PNG · PDF`}
    >
      <div className="grid grid-cols-2 gap-2">
        {variants.map((v) => (
          <div
            key={v.id}
            className="relative aspect-square rounded-md border border-border overflow-hidden flex items-center justify-center"
            style={{ backgroundColor: v.bg }}
          >
            <svg viewBox="0 0 100 100" className="w-3/4 h-3/4" xmlns="http://www.w3.org/2000/svg">
              <LogoSlot
                ctx={ctx}
                x={v.size === 'sm' ? 30 : 10}
                y={v.size === 'sm' ? 30 : 10}
                width={v.size === 'sm' ? 40 : 80}
                height={v.size === 'sm' ? 40 : 80}
                fill={v.forceFill}
              />
            </svg>
            <span className="absolute bottom-1.5 left-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-background/80 backdrop-blur text-muted-foreground">
              {v.label}
            </span>
          </div>
        ))}
      </div>
    </KitCard>
  );
}
