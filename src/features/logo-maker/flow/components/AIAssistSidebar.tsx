import { Sparkles, Palette, FileText, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AIAssistSidebarProps {
  competitorUrl: string;
  onCompetitorUrlChange: (url: string) => void;
  // Phase 3 will pass real handlers. Phase 1 ships the UI with stubs.
  onSuggestNames?: () => void;
  onSuggestPalette?: () => void;
  onWriteTagline?: () => void;
  className?: string;
}

export function AIAssistSidebar({
  competitorUrl,
  onCompetitorUrlChange,
  onSuggestNames,
  onSuggestPalette,
  onWriteTagline,
  className,
}: AIAssistSidebarProps) {
  const notYet = (label: string) =>
    toast(`${label} ships in Phase 3`, {
      description: 'AI generation requires the Claude + Gemini pipeline. Wiring up soon.',
    });

  return (
    <aside
      className={cn(
        'rounded-lg border border-border bg-card/50 p-4 space-y-4',
        className,
      )}
      aria-label="AI assist"
    >
      <header className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">AI assist</h3>
      </header>

      <div className="space-y-2">
        <AssistAction
          icon={<Sparkles className="w-4 h-4" />}
          label="Suggest 10 brand names"
          onClick={onSuggestNames ?? (() => notYet('Name suggestions'))}
        />
        <AssistAction
          icon={<Palette className="w-4 h-4" />}
          label="Suggest color palettes"
          onClick={onSuggestPalette ?? (() => notYet('Palette suggestions'))}
        />
        <AssistAction
          icon={<FileText className="w-4 h-4" />}
          label="Write tagline"
          onClick={onWriteTagline ?? (() => notYet('Tagline writer'))}
        />
      </div>

      <div className="pt-4 border-t border-border space-y-2">
        <Label htmlFor="competitor-url" className="flex items-center gap-1.5 text-xs">
          <Link2 className="w-3 h-3" />
          Competitor reference
        </Label>
        <Input
          id="competitor-url"
          type="url"
          placeholder="https://competitor.com"
          value={competitorUrl}
          onChange={(e) => onCompetitorUrlChange(e.target.value)}
          className="h-9 text-sm"
        />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          On blur, AI analyzes what NOT to copy. (Coming in Phase 3.)
        </p>
      </div>
    </aside>
  );
}

function AssistAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-left',
        'border border-border bg-background hover:bg-accent/40 hover:border-muted-foreground/40',
        'transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <span className="text-primary">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
