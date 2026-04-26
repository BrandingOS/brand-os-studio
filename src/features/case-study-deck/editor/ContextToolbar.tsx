/**
 * ContextToolbar — 44px row mounted between EditorChrome and the
 * canvas area.
 *
 * Three groups:
 *   - Left:   undo / redo
 *   - Center: zoom controls (− / fit / 100% / + / slider)
 *   - Right:  fullscreen + present mode
 */
import { useNavigate } from 'react-router-dom';
import { Undo2, Redo2, Minus, Plus, Maximize2, Play, Maximize } from 'lucide-react';

interface Props {
  scale: number;
  setScale: (n: number) => void;
  fitScale: number;
  /** Callback to fit canvas to viewport. */
  onFit: () => void;
  onUndo: () => void;
  onRedo: () => void;
  /** Path used for "Present" — usually the deck viewer. */
  presentPath: string;
}

const MIN = 0.25;
const MAX = 2.0;

export function ContextToolbar({ scale, setScale, fitScale: _fitScale, onFit, onUndo, onRedo, presentPath }: Props) {
  const navigate = useNavigate();

  const clamp = (n: number) => Math.max(MIN, Math.min(MAX, n));
  const goFullscreen = () => {
    const el = document.documentElement;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      el.requestFullscreen?.();
    }
  };

  const pct = Math.round(scale * 100);

  return (
    <div
      style={{
        height: 44,
        background: '#0d0d0d',
        borderBottom: '1px solid #1c1c1c',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 8,
        color: '#fff',
        flexShrink: 0,
      }}
    >
      {/* Left — Undo/Redo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <ToolbarButton onClick={onUndo} title="Undo (Cmd+Z)">
          <Undo2 size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={onRedo} title="Redo (Cmd+Shift+Z)">
          <Redo2 size={15} />
        </ToolbarButton>
      </div>

      <div style={{ flex: 1 }} />

      {/* Center — Zoom */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <ToolbarButton onClick={() => setScale(clamp(scale - 0.1))} title="Zoom out (Cmd-)">
          <Minus size={14} />
        </ToolbarButton>
        <button
          onClick={onFit}
          title="Fit to screen (Cmd+0)"
          style={pillStyle(false)}
        >
          Fit
        </button>
        <button
          onClick={() => setScale(1)}
          title="100%"
          style={pillStyle(scale === 1)}
        >
          {pct}%
        </button>
        <ToolbarButton onClick={() => setScale(clamp(scale + 0.1))} title="Zoom in (Cmd+=)">
          <Plus size={14} />
        </ToolbarButton>
        <input
          type="range"
          min={MIN * 100}
          max={MAX * 100}
          step={5}
          value={pct}
          onChange={(e) => setScale(Number(e.target.value) / 100)}
          style={{ width: 100, accentColor: '#fff' }}
          aria-label="Zoom"
        />
      </div>

      <div style={{ flex: 1 }} />

      {/* Right — Fullscreen + Present */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <ToolbarButton onClick={goFullscreen} title="Fullscreen">
          <Maximize2 size={15} />
        </ToolbarButton>
        <button
          onClick={() => navigate(presentPath)}
          title="Present"
          style={{
            background: '#fff',
            color: '#000',
            border: 'none',
            borderRadius: 6,
            padding: '6px 12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Play size={13} fill="currentColor" /> Present
        </button>
      </div>
    </div>
  );
}

function ToolbarButton({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        background: 'transparent',
        border: '1px solid transparent',
        color: '#cfd1d4',
        height: 28,
        width: 28,
        borderRadius: 6,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'background 100ms, color 100ms',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = '#1c1c1c';
        (e.currentTarget as HTMLButtonElement).style.color = '#fff';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
        (e.currentTarget as HTMLButtonElement).style.color = '#cfd1d4';
      }}
    >
      {children}
    </button>
  );
}

function pillStyle(active: boolean): React.CSSProperties {
  return {
    background: active ? '#fff' : 'transparent',
    color: active ? '#000' : '#cfd1d4',
    border: '1px solid #232323',
    height: 28,
    minWidth: 56,
    padding: '0 10px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.04em',
  };
}

// Avoid unused-import warning for Maximize when tree-shaking
void Maximize;
