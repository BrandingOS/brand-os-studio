import { useState } from 'react';
import type { FeelPalette } from '../types';
import { ColorPicker } from './ColorPicker';

interface Props {
  palette: FeelPalette;
  selected: boolean;
  editing: boolean;
  onSelect(): void;
  onToggleLock(): void;
  onEdit(): void;
  onStopEdit(): void;
  onUpdateColors(colors: string[]): void;
}

export function PaletteCard({
  palette,
  selected,
  editing,
  onSelect,
  onToggleLock,
  onEdit,
  onStopEdit,
  onUpdateColors,
}: Props) {
  const [pickerIdx, setPickerIdx] = useState<number | null>(null);
  const cls = [
    'palette-card',
    selected ? 'is-selected' : '',
    palette.locked ? 'is-locked' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const handleApply = (hex: string) => {
    if (pickerIdx == null) return;
    const next = [...palette.colors];
    next[pickerIdx] = hex;
    onUpdateColors(next);
    setPickerIdx(null);
  };

  const handleAdd = () => {
    onUpdateColors([...palette.colors, '#888888']);
    setPickerIdx(palette.colors.length);
  };

  const handleRemove = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (palette.colors.length <= 1) return;
    onUpdateColors(palette.colors.filter((_, i) => i !== idx));
  };

  return (
    <div
      className={cls}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('.lock-toggle')) return;
        if ((e.target as HTMLElement).closest('.color-picker')) return;
        if ((e.target as HTMLElement).closest('.swatch')) return;
        if (selected && !editing) {
          onEdit();
        } else if (!selected) {
          onSelect();
        }
      }}
    >
      <button
        type="button"
        className="lock-toggle"
        aria-label={palette.locked ? 'Unlock palette' : 'Lock palette'}
        data-locked={palette.locked ? 'true' : 'false'}
        onClick={(e) => {
          e.stopPropagation();
          onToggleLock();
        }}
      >
        {palette.locked ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x={5} y={11} width={14} height={10} rx={2} />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x={5} y={11} width={14} height={10} rx={2} />
            <path d="M8 11V7a4 4 0 1 1 8 0" />
          </svg>
        )}
      </button>

      <div className="palette-strips">
        {palette.colors.map((c, i) => (
          <span key={`${c}-${i}`} style={{ background: c }} />
        ))}
      </div>

      {selected && (
        <div className="swatches">
          {palette.colors.map((c, i) => (
            <button
              type="button"
              key={i}
              className="swatch"
              style={{ background: c }}
              onClick={(e) => {
                e.stopPropagation();
                setPickerIdx(i);
                if (!editing) onEdit();
              }}
            >
              {palette.colors.length > 1 && (
                <span className="swatch-remove" onClick={(e) => handleRemove(i, e)}>
                  ×
                </span>
              )}
            </button>
          ))}
          {palette.colors.length < 8 && (
            <button
              type="button"
              className="swatch-add"
              onClick={(e) => {
                e.stopPropagation();
                handleAdd();
              }}
            >
              +
            </button>
          )}
        </div>
      )}

      <div className="palette-meta">
        <span className="palette-name">{palette.name}</span>
        <span className="palette-vibe">{palette.vibe}</span>
      </div>

      {selected && (
        <ColorPicker
          open={editing && pickerIdx !== null}
          initialHex={pickerIdx != null ? palette.colors[pickerIdx] ?? '#000000' : '#000000'}
          onCancel={() => {
            setPickerIdx(null);
            onStopEdit();
          }}
          onApply={handleApply}
        />
      )}
    </div>
  );
}
