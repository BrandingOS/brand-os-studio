/**
 * The floating sidebar shell.
 *
 * Presentational on purpose: a header (optional back arrow, title, close) and
 * a scrolling body. Which panel goes inside is the builder's decision, so the
 * back-to-outline behaviour and the panel list stay in one place instead of
 * being split across a shell and its contents.
 */
import { ChevronLeft, X } from 'lucide-react';
import type { ReactNode } from 'react';

export function GuidelineSidebar({
  title,
  onBack,
  onClose,
  children,
}: {
  title: string;
  /** Present only for drill-downs — the page editor inside the outline. */
  onBack?: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <aside className="gl-sidebar" aria-label={title}>
      <header className="gl-sidebar-head">
        {onBack && (
          <button type="button" className="gl-icon-btn" onClick={onBack} aria-label="Back to outline">
            <ChevronLeft size={16} strokeWidth={1.8} aria-hidden />
          </button>
        )}
        <h2 className="gl-sidebar-title">{title}</h2>
        <button type="button" className="gl-icon-btn" onClick={onClose} aria-label="Close panel">
          <X size={16} strokeWidth={1.8} aria-hidden />
        </button>
      </header>
      <div className="gl-sidebar-body">{children}</div>
    </aside>
  );
}
