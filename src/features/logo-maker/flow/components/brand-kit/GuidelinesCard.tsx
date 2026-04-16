import { FileText } from 'lucide-react';
import { KitCard } from './KitCard';
import type { BrandContext } from '@/shared/services/mockup/registry';

export function GuidelinesCard({ ctx }: { ctx: BrandContext }) {
  return (
    <KitCard title="Brand guidelines" meta="PDF · generated on download">
      <div className="rounded-md border border-border bg-muted/30 overflow-hidden flex items-stretch">
        <div className="w-24 aspect-[3/4] bg-gradient-to-br from-background to-muted flex items-center justify-center relative">
          <FileText className="w-8 h-8 text-muted-foreground" />
          <div
            className="absolute top-0 left-0 right-0 h-2"
            style={{ backgroundColor: ctx.primaryColor }}
          />
        </div>
        <div className="flex-1 p-3">
          <p className="text-sm font-semibold truncate">{ctx.brandName} guidelines.pdf</p>
          <p className="text-[11px] text-muted-foreground">8 pages · A4</p>
          <ul className="text-[10px] text-muted-foreground mt-2 space-y-0.5">
            <li>• Logo usage & clearspace</li>
            <li>• Color palette with hex codes</li>
            <li>• Typography system</li>
            <li>• Do's and Don'ts</li>
          </ul>
        </div>
      </div>
    </KitCard>
  );
}
