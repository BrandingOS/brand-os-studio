import type { BrandContext } from '@/shared/services/mockup/registry';
import { LogoSlot } from '@/shared/services/mockup/shared';
import { KitCard } from './KitCard';

const NETWORKS = [
  { id: 'instagram', label: 'IG' },
  { id: 'x', label: 'X' },
  { id: 'linkedin', label: 'in' },
  { id: 'youtube', label: 'YT' },
  { id: 'facebook', label: 'f' },
  { id: 'tiktok', label: 'TT' },
] as const;

export function SocialProfilesCard({ ctx }: { ctx: BrandContext }) {
  return (
    <KitCard title="Social profiles" meta="Round + square · 1080 × 1080">
      <div className="grid grid-cols-3 gap-2">
        {NETWORKS.map((n) => (
          <div key={n.id} className="flex flex-col items-center gap-1.5">
            <svg viewBox="0 0 100 100" className="w-full rounded-full overflow-hidden" xmlns="http://www.w3.org/2000/svg">
              <circle cx={50} cy={50} r={50} fill={ctx.primaryColor} />
              <LogoSlot ctx={ctx} x={24} y={24} width={52} height={52} fill="#ffffff" />
            </svg>
            <span className="text-[10px] text-muted-foreground">{n.label}</span>
          </div>
        ))}
      </div>
    </KitCard>
  );
}
