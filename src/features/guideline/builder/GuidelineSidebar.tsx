/**
 * The floating panel, in the house style.
 *
 * `.panel` / `.panel-top` / `.panel-heading` / `.panel-list` are the Studio's
 * sidebar vocabulary — Setup, Brand Kit and Tools all render exactly this
 * markup, and `.panel` already brings the sticky positioning, the viewport
 * height cap and the scroll behaviour. An earlier version of this file
 * reinvented all of that under a `gl-` prefix; this one owns nothing but the
 * header row, because the header row is the only part the house style has no
 * component for.
 */
import { ChevronLeft, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { DsEyebrow } from '@/shared/ds';

export function GuidelineSidebar({
  eyebrow,
  title,
  onBack,
  onClose,
  children,
}: {
  eyebrow: string;
  title: string;
  /** Present only for a drill-down — the page editor inside the outline. */
  onBack?: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <aside className="panel" aria-label={title}>
      <div className="panel-top gl-panel-top">
        {onBack && (
          <button type="button" className="gl-icon-btn" onClick={onBack} aria-label="Back to outline">
            <ChevronLeft size={16} strokeWidth={1.8} aria-hidden />
          </button>
        )}
        <div className="panel-heading gl-panel-heading">
          <DsEyebrow>{eyebrow}</DsEyebrow>
          <h1 className="panel-heading-title">{title}</h1>
        </div>
        <button type="button" className="gl-icon-btn" onClick={onClose} aria-label="Close panel">
          <X size={16} strokeWidth={1.8} aria-hidden />
        </button>
      </div>
      {children}
    </aside>
  );
}
