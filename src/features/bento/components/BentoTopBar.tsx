import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Undo2, Redo2, Shuffle, Download, LayoutGrid, Save, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useBentoStore } from '../store';
import { SizePicker } from './SizePicker';
import type { Brand } from '@/shared/types/brand';
import type { SizePresetId } from '../types';

interface Props {
  brand?: Brand | null;
  /** Where the "back" button goes. */
  backTo: string;
  backLabel?: string;
  onShuffle: (mode: 'content' | 'layout+content') => void;
  onExport: () => void;
  onSave?: () => void;
  canSave?: boolean;
  extraLeft?: React.ReactNode;
}

export function BentoTopBar({ brand, backTo, backLabel = 'Back', onShuffle, onExport, onSave, canSave, extraLeft }: Props) {
  const navigate = useNavigate();
  const design = useBentoStore((s) => s.design);
  const undo = useBentoStore((s) => s.undo);
  const redo = useBentoStore((s) => s.redo);
  const canUndo = useBentoStore((s) => s.past.length > 0);
  const canRedo = useBentoStore((s) => s.future.length > 0);
  const setSize = useBentoStore((s) => s.setSize);
  const setBackground = useBentoStore((s) => s.setBackground);

  return (
    <header className="h-14 shrink-0 border-b flex items-center justify-between px-3 bg-white/95 backdrop-blur z-20 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(backTo)} title={backLabel}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="h-5 w-px bg-border" />
        <div className="flex items-center gap-2 px-1 min-w-0">
          <LayoutGrid className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-semibold truncate">Bento Grid</span>
          {brand && (
            <span className="text-xs text-muted-foreground truncate hidden sm:inline">· {brand.name}</span>
          )}
        </div>
        {extraLeft && <div className="ml-2">{extraLeft}</div>}
      </div>

      <div className="flex items-center gap-2">
        <SizePicker value={design.sizeId as SizePresetId} onChange={(id, custom) => setSize(id, custom)} />
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">BG</label>
          <Input
            type="color"
            value={design.backgroundColor}
            onChange={(e) => setBackground(e.target.value)}
            className="h-8 w-9 p-0.5 cursor-pointer"
          />
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-9 w-9" disabled={!canUndo} onClick={undo} title="Undo (⌘Z)">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9" disabled={!canRedo} onClick={redo} title="Redo (⇧⌘Z)">
          <Redo2 className="h-4 w-4" />
        </Button>
        <div className="h-5 w-px bg-border mx-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-9 gap-1.5">
              <Shuffle className="h-3.5 w-3.5" />
              Shuffle
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onShuffle('content')}>Shuffle content only</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onShuffle('layout+content')}>Shuffle everything</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {onSave && (
          <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={onSave} disabled={!canSave} title={canSave ? 'Save to brand' : 'Select a brand first'}>
            <Save className="h-3.5 w-3.5" />
            Save
          </Button>
        )}
        <Button size="sm" className="h-9 gap-1.5" onClick={onExport}>
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </div>
    </header>
  );
}

// Share icon is exported for future wiring — silences unused import warnings.
void Share2;
