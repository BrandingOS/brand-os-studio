/**
 * FloatingToolbar — appears above a selected block.
 * Shows contextual controls based on block type (text, image, card, etc.)
 * Matches the Figma design exactly.
 */
import { useState } from 'react';
import { ChevronDown, MoreHorizontal, Maximize2 } from 'lucide-react';
import type { BlockType } from './BlockTypes';
import { TURN_INTO_OPTIONS } from './BlockTypes';

interface FloatingToolbarProps {
  blockType: BlockType;
  style: {
    fontWeight?: string;
    textAlign?: string;
    color?: string;
  };
  onChangeType: (type: BlockType) => void;
  onChangeStyle: (key: string, value: string) => void;
  position: { top: number; left: number; width: number };
}

export function FloatingToolbar({ blockType, style, onChangeType, onChangeStyle, position }: FloatingToolbarProps) {
  const [showTurnInto, setShowTurnInto] = useState(false);
  const [showColors, setShowColors] = useState(false);

  const isText = blockType === 'text' || blockType === 'heading';
  const isImage = blockType === 'image' || blockType === 'logo';

  const colors = ['#ffffff', '#000000', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280'];

  return (
    <div
      className="absolute z-50 flex items-center gap-0.5 bg-[#2a2a2a] rounded-xl px-1 py-1 shadow-2xl border border-white/[0.08] animate-in fade-in duration-100"
      style={{
        top: position.top - 48,
        left: position.left + position.width / 2,
        transform: 'translateX(-50%)',
      }}
    >
      {/* Block type dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowTurnInto(!showTurnInto)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        >
          {isText ? (blockType === 'heading' ? 'Heading' : 'Paragraph') : isImage ? 'Image' : blockType}
          <ChevronDown className="h-3 w-3 text-white/30" />
        </button>

        {/* Turn Into dropdown */}
        {showTurnInto && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-[#2a2a2a] rounded-xl border border-white/[0.08] py-1.5 shadow-2xl z-50">
            <p className="text-[10px] text-white/20 uppercase tracking-wider font-semibold px-3 py-1">Turn into</p>
            {TURN_INTO_OPTIONS.map(opt => (
              <button
                key={opt.type}
                onClick={() => { onChangeType(opt.type); setShowTurnInto(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] transition-colors ${
                  opt.type === blockType ? 'text-white bg-white/5' : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="w-4 text-center text-white/30 text-[11px]">{opt.icon}</span>
                <span className="flex-1 text-left">{opt.label}</span>
                {opt.type === blockType && <span className="text-white/40 text-[10px]">✓</span>}
                {['image', 'card', 'chart', 'mockup', 'embed'].includes(opt.type) && <span className="text-white/15 text-[10px]">›</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Text-specific controls */}
      {isText && (
        <>
          <div className="w-px h-4 bg-white/10 mx-0.5" />

          {/* Font weight */}
          <button className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[12px] text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            {style.fontWeight || 'Medium'} <ChevronDown className="h-3 w-3 text-white/20" />
          </button>

          {/* Font size */}
          <button className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[12px] text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            Aa <ChevronDown className="h-3 w-3 text-white/20" />
          </button>

          <div className="w-px h-4 bg-white/10 mx-0.5" />

          {/* Color picker */}
          <div className="relative">
            <button
              onClick={() => setShowColors(!showColors)}
              className="flex items-center gap-1 px-1.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: style.color || '#ffffff' }} />
              <ChevronDown className="h-3 w-3 text-white/20" />
            </button>

            {showColors && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-[#2a2a2a] rounded-xl border border-white/[0.08] p-2 shadow-2xl z-50">
                <div className="flex gap-1">
                  {colors.map(c => (
                    <button
                      key={c}
                      onClick={() => { onChangeStyle('color', c); setShowColors(false); }}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${style.color === c ? 'border-white scale-110' : 'border-white/10 hover:border-white/30'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Alignment */}
          <button className="flex items-center gap-1 px-1.5 py-1.5 rounded-lg text-[12px] text-white/50 hover:text-white hover:bg-white/10 transition-colors">
            ≡ <ChevronDown className="h-3 w-3 text-white/20" />
          </button>

          {/* Container */}
          <button className="flex items-center gap-1 px-1.5 py-1.5 rounded-lg text-[12px] text-white/50 hover:text-white hover:bg-white/10 transition-colors">
            ▢ <ChevronDown className="h-3 w-3 text-white/20" />
          </button>

          <div className="w-px h-4 bg-white/10 mx-0.5" />

          {/* Draw / effects */}
          <button className="px-1.5 py-1.5 rounded-lg text-[12px] text-white/40 hover:text-white hover:bg-white/10 transition-colors">✎</button>
          <button className="flex items-center gap-0.5 px-1.5 py-1.5 rounded-lg text-[12px] text-white/40 hover:text-white hover:bg-white/10 transition-colors">
            ✏ <ChevronDown className="h-3 w-3 text-white/20" />
          </button>
        </>
      )}

      {/* Image-specific controls */}
      {isImage && (
        <>
          <div className="w-px h-4 bg-white/10 mx-0.5" />
          <button className="px-1.5 py-1.5 rounded-lg text-[11px] text-white/40 hover:text-white hover:bg-white/10 transition-colors">🖼</button>
          <button className="flex items-center gap-0.5 px-1.5 py-1.5 rounded-lg text-[11px] text-white/40 hover:text-white hover:bg-white/10 transition-colors">⚙ <ChevronDown className="h-3 w-3 text-white/20" /></button>
          <button className="flex items-center gap-0.5 px-1.5 py-1.5 rounded-lg text-[11px] text-white/40 hover:text-white hover:bg-white/10 transition-colors">▢ <ChevronDown className="h-3 w-3 text-white/20" /></button>
          <button className="flex items-center gap-0.5 px-1.5 py-1.5 rounded-lg text-[11px] text-white/40 hover:text-white hover:bg-white/10 transition-colors">📐 <ChevronDown className="h-3 w-3 text-white/20" /></button>
          <div className="w-px h-4 bg-white/10 mx-0.5" />
          <button className="px-1.5 py-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors">
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </>
      )}

      {/* More button (always) */}
      <button className="px-1.5 py-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors">
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
