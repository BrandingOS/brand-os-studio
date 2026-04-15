import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Undo2, Redo2, Shuffle, Download, LayoutGrid, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useBentoStore } from '../store';
import { SizePicker } from './SizePicker';
import { LayoutPopover } from './LayoutPopover';
import type { Brand } from '@/shared/types/brand';
import type { SizePresetId } from '../types';

interface Props {
  brand?: Brand | null;
  backTo: string;
  backLabel?: string;
  onShuffle: (mode: 'content' | 'layout+content') => void;
  onExport: () => void;
  onSave?: () => void;
  canSave?: boolean;
  extraLeft?: React.ReactNode;
}

/**
 * Bento editor topbar. Height `h-14`, same chrome conventions as the
 * workspace/brand topbars elsewhere in the app (flat bottom border,
 * muted ghost icons, primary action on the right).
 */
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
    <header className="h-14 shrink-0 border-b flex items-center justify-between px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 z-20 gap-3">
      {/* Left cluster: back + title + extras */}
      <div className="flex items-center gap-3 min-w-0">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(backTo)} title={backLabel}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <LayoutGrid className="h-3.5 w-3.5" />
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-sm font-semibold truncate">Bento</span>
            {brand && (
              <span className="text-[11px] text-muted-foreground truncate">{brand.name}</span>
            )}
          </div>
        </div>
        {extraLeft && <div className="ml-1">{extraLeft}</div>}
      </div>

      {/* Center cluster: size + background + layout */}
      <div className="flex items-center gap-2">
        <SizePicker value={design.sizeId as SizePresetId} onChange={(id, custom) => setSize(id, custom)} />
        <label className="relative inline-flex items-center h-8 w-10 rounded-md border cursor-pointer overflow-hidden" title="Background color">
          <input
            type="color"
            value={design.backgroundColor}
            onChange={(e) => setBackground(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <span className="w-full h-full" style={{ background: design.backgroundColor }} />
        </label>
        <LayoutPopover />
      </div>

      {/* Right cluster: history + actions */}
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
