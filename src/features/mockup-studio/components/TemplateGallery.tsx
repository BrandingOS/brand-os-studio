/**
 * TemplateGallery — browsable list of templates in the left sidebar.
 */

import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { TemplateMeta } from '../engine/types';

interface TemplateGalleryProps {
  templates: TemplateMeta[];
  activeId: string | null;
  onPick: (template: TemplateMeta) => void;
}

export function TemplateGallery({ templates, activeId, onPick }: TemplateGalleryProps) {
  if (templates.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No templates available.
      </div>
    );
  }

  return (
    <div className="p-3 flex flex-col gap-2">
      {templates.map((t) => {
        const active = t.id === activeId;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onPick(t)}
            className={cn(
              'group relative flex items-center gap-3 rounded-lg p-2 text-left transition-colors',
              active ? 'bg-primary/10 ring-1 ring-primary/40' : 'hover:bg-muted/60',
            )}
          >
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-border/60">
              <img
                src={t.assets.thumbnail ?? t.assets.base}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{t.name}</p>
              <p className="truncate text-[11px] uppercase tracking-wider text-muted-foreground">
                {t.category}
              </p>
            </div>
            {active && <Check className="h-4 w-4 text-primary" />}
          </button>
        );
      })}
    </div>
  );
}
