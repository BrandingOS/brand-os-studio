/**
 * EditableBlock — wraps any slide content element.
 * Click to select (shows border), double-click text to edit inline.
 * Shows the FloatingToolbar when selected.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import type { BlockType } from './BlockTypes';
import { FloatingToolbar } from './FloatingToolbar';

interface EditableBlockProps {
  id: string;
  type: BlockType;
  children: React.ReactNode;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDeselect: () => void;
  style?: {
    fontWeight?: string;
    textAlign?: string;
    color?: string;
  };
  className?: string;
}

export function EditableBlock({ id, type, children, isSelected, onSelect, onDeselect, style = {}, className = '' }: EditableBlockProps) {
  const blockRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  // Update toolbar position when selected
  useEffect(() => {
    if (isSelected && blockRef.current) {
      const rect = blockRef.current.getBoundingClientRect();
      setPosition({ top: rect.top, left: rect.left, width: rect.width });
    }
  }, [isSelected]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(id);
  }, [id, onSelect]);

  const handleDoubleClick = useCallback(() => {
    if (type === 'text' || type === 'heading') {
      setIsEditing(true);
    }
  }, [type]);

  const isText = type === 'text' || type === 'heading';

  return (
    <>
      <div
        ref={blockRef}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        className={`relative transition-all duration-150 cursor-pointer ${
          isSelected
            ? 'ring-2 ring-white/40 rounded-lg'
            : 'hover:ring-1 hover:ring-white/10 rounded-lg'
        } ${className}`}
        contentEditable={isEditing && isText}
        suppressContentEditableWarning
        onBlur={() => setIsEditing(false)}
        style={isEditing ? { outline: 'none', cursor: 'text' } : undefined}
      >
        {children}

        {/* Selection border overlay — matches Figma (white rounded border) */}
        {isSelected && !isEditing && (
          <div className="absolute inset-0 pointer-events-none rounded-lg border-2 border-white/30" />
        )}

        {/* Image selection — shows dashed grid (Figma style) */}
        {isSelected && (type === 'image' || type === 'logo') && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 border-2 border-dashed border-orange-400/50 rounded-lg" />
            {/* Grid guides */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="border border-dashed border-white/[0.08]" />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Toolbar */}
      {isSelected && (
        <FloatingToolbar
          blockType={type}
          style={style}
          onChangeType={() => {}}
          onChangeStyle={() => {}}
          position={position}
        />
      )}
    </>
  );
}
