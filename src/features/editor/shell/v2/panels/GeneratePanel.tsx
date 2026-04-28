// GeneratePanel — placeholder UI for AI generation.
//
// R4: the canonical panel title now lives in the SecondaryPanel
// header bar, so the inline "Generate" heading is gone. The prompt
// composer sits directly in the panel body.
//
// Phase 3.5 (AI Editing Layer) wires the actual generation flow.

import { Sparkles } from 'lucide-react';

export function GeneratePanel() {
  return (
    <div style={{ padding: '12px 14px' }}>
      <div
        className="rounded-xl p-2"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
        }}
      >
        <textarea
          rows={3}
          placeholder="Describe what you want to create…"
          className="w-full resize-none bg-transparent text-[13px] outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
        <div className="mt-1 flex items-center justify-between">
          <button
            type="button"
            className="rounded-lg px-2 py-0.5 text-[10px] transition-colors"
            style={{
              background: 'var(--surface-sunken)',
              color: 'var(--text-secondary)',
            }}
            disabled
          >
            Social post ▾
          </button>
          <button
            type="button"
            className="pill-btn pill-btn--primary"
            style={{ height: 28, padding: '0 12px', fontSize: 12, opacity: 0.5 }}
            disabled
            title="AI generation lands in Phase 3.5"
          >
            <Sparkles size={12} />
            <span>Generate</span>
          </button>
        </div>
      </div>
    </div>
  );
}
