// GeneratePanel — placeholder UI for AI generation.
//
// Phase 5a renders the surface only; the actual generation flow
// (prompt → applyBrandToDocument → adapter.loadDocument) is part
// of Phase 3.5 (AI Editing Layer). The panel ships with a disabled
// Generate button and a stub Recent list so the user can see where
// the feature will live.

import { Sparkles } from 'lucide-react';

export function GeneratePanel() {
  return (
    <>
      <div className="panel-top">
        <div className="panel-heading">
          <span className="panel-heading-eyebrow">AI</span>
          <h1 className="panel-heading-title">Generate</h1>
        </div>
        <div
          className="rounded-xl p-2"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
        >
          <textarea
            rows={2}
            placeholder='Try "Instagram post for our product launch"…'
            className="w-full resize-none bg-transparent text-[12px] outline-none"
            style={{ color: 'var(--text-primary)' }}
            // 5a: input is live but Generate is disabled.
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
              style={{ height: 26, padding: '0 10px', fontSize: 11, opacity: 0.5 }}
              disabled
              title="AI generation lands in Phase 3.5"
            >
              <Sparkles size={12} />
              <span>Generate</span>
            </button>
          </div>
        </div>
      </div>
      <div className="panel-list">
        <p
          className="px-2 py-3 text-[11px]"
          style={{ color: 'var(--text-muted)' }}
        >
          AI generation lands in Phase 3.5. The prompt input and history will
          live here.
        </p>
      </div>
    </>
  );
}
