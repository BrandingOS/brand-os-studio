import {
  Type, Square, Circle, Image, Trash2, Copy,
  ArrowUp, ArrowDown, Palette
} from 'lucide-react';
import type { Brand } from '@/shared/types/brand';

interface EditorToolbarProps {
  onAddText: () => void;
  onAddRect: () => void;
  onAddCircle: () => void;
  onAddImage: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  brand: Brand;
}

function ToolButton({ icon: Icon, label, onClick, danger }: { icon: React.ElementType; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors ${
        danger
          ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
          : 'text-gray-400 hover:bg-white/10 hover:text-white'
      }`}
      title={label}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="text-xs">{label}</span>
    </button>
  );
}

export function EditorToolbar({
  onAddText, onAddRect, onAddCircle, onAddImage,
  onDelete, onDuplicate, onBringForward, onSendBackward,
  brand,
}: EditorToolbarProps) {
  return (
    <div className="w-48 bg-[#2a2a3e] border-r border-[#3a3a4e] flex flex-col shrink-0 overflow-auto">
      {/* Add Elements */}
      <div className="p-3 border-b border-[#3a3a4e]">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2 px-1">Add Elements</p>
        <div className="space-y-0.5">
          <ToolButton icon={Type} label="Text" onClick={onAddText} />
          <ToolButton icon={Square} label="Rectangle" onClick={onAddRect} />
          <ToolButton icon={Circle} label="Circle" onClick={onAddCircle} />
          <ToolButton icon={Image} label="Image" onClick={onAddImage} />
        </div>
      </div>

      {/* Arrange */}
      <div className="p-3 border-b border-[#3a3a4e]">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2 px-1">Arrange</p>
        <div className="space-y-0.5">
          <ToolButton icon={Copy} label="Duplicate" onClick={onDuplicate} />
          <ToolButton icon={ArrowUp} label="Bring Forward" onClick={onBringForward} />
          <ToolButton icon={ArrowDown} label="Send Backward" onClick={onSendBackward} />
          <ToolButton icon={Trash2} label="Delete" onClick={onDelete} danger />
        </div>
      </div>

      {/* Brand Colors */}
      <div className="p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2 px-1 flex items-center gap-1">
          <Palette className="h-3 w-3" /> Brand Colors
        </p>
        <div className="flex flex-wrap gap-1.5 px-1">
          {[
            brand.primaryColor,
            brand.secondaryColor,
            '#ffffff',
            '#000000',
            '#f5f5f5',
            '#333333',
          ].filter(Boolean).map((color) => (
            <button
              key={color}
              className="w-7 h-7 rounded-lg border border-white/20 hover:scale-110 transition-transform"
              style={{ backgroundColor: color }}
              title={color}
              onClick={() => {
                navigator.clipboard.writeText(color!);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
