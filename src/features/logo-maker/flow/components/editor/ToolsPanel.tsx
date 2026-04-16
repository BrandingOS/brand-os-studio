import { MousePointer2, Type, Square, Circle, Minus, Layers, Wand2, Palette, Shuffle, Ruler } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ToolId } from '../../hooks/useEditorShortcuts';

interface ToolsPanelProps {
  activeTool: ToolId;
  onSelectTool: (tool: ToolId) => void;
  onAddText: () => void;
  onAddRect: () => void;
  onAddCircle: () => void;
  onAddLine: () => void;
}

export function ToolsPanel({
  activeTool,
  onSelectTool,
  onAddText,
  onAddRect,
  onAddCircle,
  onAddLine,
}: ToolsPanelProps) {
  const phase5 = (label: string) =>
    toast(`${label} ships in Phase 5`, { description: 'AI actions need the Claude + Gemini pipeline.' });

  return (
    <aside className="w-[180px] shrink-0 border-r border-border bg-card/40 flex flex-col h-full">
      <Section label="Tools">
        <ToolButton
          icon={<MousePointer2 className="w-4 h-4" />}
          label="Select"
          shortcut="V"
          active={activeTool === 'select'}
          onClick={() => onSelectTool('select')}
        />
        <ToolButton
          icon={<Type className="w-4 h-4" />}
          label="Text"
          shortcut="T"
          active={activeTool === 'text'}
          onClick={() => {
            onSelectTool('text');
            onAddText();
          }}
        />
        <ToolButton
          icon={<Square className="w-4 h-4" />}
          label="Rectangle"
          shortcut="R"
          active={activeTool === 'rect'}
          onClick={() => {
            onSelectTool('rect');
            onAddRect();
          }}
        />
        <ToolButton
          icon={<Circle className="w-4 h-4" />}
          label="Circle"
          shortcut="O"
          active={activeTool === 'circle'}
          onClick={() => {
            onSelectTool('circle');
            onAddCircle();
          }}
        />
        <ToolButton
          icon={<Minus className="w-4 h-4" />}
          label="Line"
          shortcut="L"
          active={activeTool === 'line'}
          onClick={() => {
            onSelectTool('line');
            onAddLine();
          }}
        />
      </Section>

      <Section label="Layers">
        <ToolButton
          icon={<Layers className="w-4 h-4" />}
          label="Layers"
          shortcut=""
          active={false}
          onClick={() => toast('Layer panel lands later — for now use Cmd+] / Cmd+[.')}
        />
      </Section>

      <Section label="AI actions">
        <ToolButton icon={<Wand2 className="w-4 h-4" />} label="Style transfer" shortcut="" active={false} onClick={() => phase5('Style transfer')} />
        <ToolButton icon={<Palette className="w-4 h-4" />} label="Suggest colors" shortcut="" active={false} onClick={() => phase5('Color suggestions')} />
        <ToolButton icon={<Shuffle className="w-4 h-4" />} label="Variants" shortcut="" active={false} onClick={() => phase5('Variant generation')} />
        <ToolButton icon={<Ruler className="w-4 h-4" />} label="Fix alignment" shortcut="" active={false} onClick={() => toast('Auto-align algorithm lands in Phase 5.')} />
      </Section>
    </aside>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 p-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-2 pt-2">
        {label}
      </span>
      {children}
    </div>
  );
}

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  shortcut: string;
  active: boolean;
  onClick: () => void;
}

function ToolButton({ icon, label, shortcut, active, onClick }: ToolButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left',
        'transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'bg-primary/10 text-foreground'
          : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground',
      )}
    >
      <span className={cn(active ? 'text-primary' : '')}>{icon}</span>
      <span className="flex-1">{label}</span>
      {shortcut && (
        <kbd className="text-[10px] font-mono text-muted-foreground/60 border border-border rounded px-1">
          {shortcut}
        </kbd>
      )}
    </button>
  );
}
