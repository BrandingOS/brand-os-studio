/**
 * HistoryPanel — sidebar showing the timeline of edit snapshots for the
 * current slide. Click any snapshot to jump back to that exact state.
 */
import { History, X, Trash2, Check } from 'lucide-react';
import { useEditorHistoryStore } from './historyStore';

interface HistoryPanelProps {
  editorKey: string;
  slideId: string;
  onJumpTo: (index: number) => void;
  onClose: () => void;
}

function formatRelative(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const sec = Math.floor(diff / 1000);
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function HistoryPanel({ editorKey, slideId, onJumpTo, onClose }: HistoryPanelProps) {
  // Subscribe to the store so panel updates live as new snapshots are added
  const data = useEditorHistoryStore((s) => s.data);
  const clearSlide = useEditorHistoryStore((s) => s.clearSlide);
  const slideHistory = data[editorKey]?.[slideId];

  const snapshots = slideHistory?.snapshots || [];
  const currentIndex = slideHistory?.currentIndex ?? -1;

  // Show newest first
  const reversed = snapshots.map((s, i) => ({ snap: s, idx: i })).reverse();

  return (
    <div className="w-72 border-l border-white/[0.06] bg-[#141414] shrink-0 flex flex-col h-full animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-white/40" />
          <h3 className="text-sm font-semibold text-white/80">History</h3>
          <span className="text-[10px] text-white/30 bg-white/[0.04] px-1.5 py-0.5 rounded-full">
            {snapshots.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Description */}
      <div className="px-4 py-3 text-[10px] text-white/25 border-b border-white/[0.04]">
        Every edit you make is saved automatically. Click any version to restore.
      </div>

      {/* Snapshots list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {snapshots.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <History className="w-8 h-8 text-white/15 mx-auto mb-3" />
            <p className="text-xs text-white/30">No edits yet</p>
            <p className="text-[10px] text-white/15 mt-1">Start editing to build history</p>
          </div>
        ) : (
          <div className="py-2">
            {reversed.map(({ snap, idx }) => {
              const isCurrent = idx === currentIndex;
              const isFuture = idx > currentIndex;
              return (
                <button
                  key={`${idx}-${snap.timestamp}`}
                  onClick={() => onJumpTo(idx)}
                  className={`w-full px-4 py-2.5 flex items-start gap-3 text-left transition-colors group ${
                    isCurrent
                      ? 'bg-white/[0.06]'
                      : isFuture
                        ? 'opacity-50 hover:bg-white/[0.03] hover:opacity-75'
                        : 'hover:bg-white/[0.03]'
                  }`}
                >
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center pt-1 shrink-0">
                    <div className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-emerald-400 ring-2 ring-emerald-400/20' : isFuture ? 'bg-white/15' : 'bg-white/30'}`} />
                    {idx < snapshots.length - 1 && (
                      <div className="w-px h-7 bg-white/[0.08] mt-1" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-medium ${isCurrent ? 'text-white/90' : 'text-white/60'}`}>
                        {snap.label || (idx === 0 ? 'Initial' : `Edit ${idx}`)}
                      </span>
                      {isCurrent && <Check className="h-3 w-3 text-emerald-400" />}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-white/30">{formatRelative(snap.timestamp)}</span>
                      <span className="text-[10px] text-white/15">·</span>
                      <span className="text-[10px] text-white/20 font-mono">{formatTime(snap.timestamp)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {snapshots.length > 0 && (
        <div className="px-4 py-3 border-t border-white/[0.06] shrink-0">
          <button
            onClick={() => {
              if (confirm('Clear history for this slide? This cannot be undone.')) {
                clearSlide(editorKey, slideId);
              }
            }}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-white/35 hover:text-red-400/80 hover:bg-red-400/[0.05] border border-white/[0.06] hover:border-red-400/20 transition-all"
          >
            <Trash2 className="h-3 w-3" />
            Clear history
          </button>
        </div>
      )}
    </div>
  );
}
