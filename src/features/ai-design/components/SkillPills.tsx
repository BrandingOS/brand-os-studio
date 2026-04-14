import { Sparkles, Palette, PenTool, Share2, Megaphone, Video } from 'lucide-react';
import type { Skill, SkillId } from '../types';
import { cn } from '@/lib/utils';

export const SKILLS: Array<Skill & { icon: React.ElementType; accent: string }> = [
  { id: 'design',       label: 'Design',       hint: 'Polished layouts',        icon: Sparkles,  accent: 'text-violet-600' },
  { id: 'branding',     label: 'Branding',     hint: 'Brand system artifacts',  icon: PenTool,   accent: 'text-emerald-600' },
  { id: 'illustration', label: 'Illustration', hint: 'Illustrative concepts',   icon: Palette,   accent: 'text-rose-600' },
  { id: 'social-post',  label: 'Social Post',  hint: 'Instagram/TikTok posts',  icon: Share2,    accent: 'text-sky-600' },
  { id: 'ad-creative',  label: 'Ad Creative',  hint: 'High-conversion ads',     icon: Megaphone, accent: 'text-amber-600' },
  { id: 'video',        label: 'Video',        hint: 'Frame-by-frame storyboards', icon: Video,  accent: 'text-fuchsia-600' },
];

export function SkillPills({
  active,
  onSelect,
  size = 'md',
}: {
  active: SkillId | null;
  onSelect: (id: SkillId | null) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {SKILLS.map((s) => {
        const Icon = s.icon;
        const isActive = active === s.id;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(isActive ? null : s.id)}
            title={s.hint}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border transition-all',
              size === 'md' ? 'px-3.5 py-1.5 text-sm' : 'px-2.5 py-1 text-xs',
              isActive
                ? 'border-primary bg-primary/10 text-primary shadow-sm'
                : 'border-border bg-background hover:bg-muted/60 text-foreground',
            )}
          >
            <Icon className={cn(size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5', isActive ? 'text-primary' : s.accent)} />
            <span className="font-medium">{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}
