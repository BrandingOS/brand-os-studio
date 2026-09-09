/**
 * The Brand Kit's ONE editing surface — a docked column, not a popup.
 *
 * The owner's words: *"make the editor customization in sidebar not above
 * the screen with popup! because I need to see what happen in background!"*
 *
 * Every editor the kit opens — the template-content editor and the six
 * brand-asset editors — docks HERE. Four rules it exists to keep, each of
 * them the reason the modal it replaces was wrong:
 *
 *  • **It is in the page's flow, never over it.** No scrim, no
 *    `position: fixed` full-viewport layer, no body-scroll lock. The panel
 *    is a grid column of `.shell`; the board reflows into what is left, so
 *    the kit is still visible AND still clickable while you edit. A modal
 *    cannot show the thing it is editing.
 *
 *  • **It is a NON-modal dialog.** `role="dialog"` with no `aria-modal`,
 *    and deliberately no focus trap: the page behind is live, so trapping
 *    the keyboard inside the panel would lie about that. Escape closes it
 *    and focus returns to whatever opened it.
 *
 *  • **One panel, one place.** The host is a single element the page
 *    renders once; a panel portals into it. Opening a second editor
 *    replaces the contents rather than stacking a second surface.
 *
 *  • **A confirmation is NOT part of the panel.** `.panel` is
 *    `position: sticky`, which creates a stacking context, so a scrim
 *    mounted inside it paints under the document (CLAUDE.md, the Guideline
 *    builder learned this the hard way). Because a panel PORTALS into the
 *    host, its `DsConfirmDialog` sibling stays where the editor is mounted
 *    — at page level — with no work from the caller.
 *
 * With no host registered (a test that mounts one editor on its own, or
 * any surface that has not opted into the dock) the panel renders in
 * place. It is a column either way; it just has no grid to sit in.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from '@/shared/ds/icons';
import './kitDock.css';

/** The element a docked panel portals into, or null when there is none. */
const KitDockContext = createContext<HTMLElement | null>(null);

export function KitDockProvider({
  host,
  children,
}: {
  host: HTMLElement | null;
  children: ReactNode;
}) {
  return <KitDockContext.Provider value={host}>{children}</KitDockContext.Provider>;
}

export function useKitDockHost(): HTMLElement | null {
  return useContext(KitDockContext);
}

export interface KitDockPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children?: ReactNode;
  /** Bottom-right actions — put the one solid primary last. */
  actions?: ReactNode;
  /** Bottom-left quiet actions (e.g. Add a colour). */
  secondaryActions?: ReactNode;
  /**
   * `wide` gives the column enough width to carry a live preview of the
   * artifact ALONGSIDE its controls. The template editor asks for it; the
   * brand-asset editors are lists and do not.
   */
  size?: 'default' | 'wide';
  /** Extra class on the panel root — used to scope an editor's own rules. */
  className?: string;
}

export function KitDockPanel({
  open,
  onClose,
  title,
  eyebrow,
  children,
  actions,
  secondaryActions,
  size = 'default',
  className,
}: KitDockPanelProps) {
  const host = useKitDockHost();
  const panelRef = useRef<HTMLElement | null>(null);
  // What had focus when the panel opened, so closing can give it back.
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    // Read once: the panel node does not change while it is open, and the
    // cleanup below must not reach for a ref that has already been cleared.
    const panelEl = panelRef.current;
    openerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    // Capture, so a control inside the panel that swallows Escape (a
    // native <select>, a colour field) cannot make the panel unclosable.
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      const opener = openerRef.current;
      openerRef.current = null;
      // Only if the user has not already moved focus somewhere real, and
      // only to something still on the page.
      if (!opener || !opener.isConnected) return;
      const active = document.activeElement;
      const stranded = !active || active === document.body || panelEl?.contains(active);
      if (stranded) opener.focus({ preventScroll: true });
    };
  }, [open, onClose]);

  if (!open) return null;

  const node = (
    <aside
      ref={panelRef}
      className={['bk-dock-panel', 'panel', className ?? ''].filter(Boolean).join(' ')}
      data-size={size}
      role="dialog"
      aria-label={title}
    >
      <header className="panel-top bk-dock-top">
        <div className="panel-heading bk-dock-heading">
          {eyebrow && <span className="panel-heading-eyebrow">{eyebrow}</span>}
          <h2 className="panel-heading-title">{title}</h2>
        </div>
        <button
          type="button"
          className="bk-dock-close"
          onClick={onClose}
          aria-label="Close editor"
        >
          <CloseIcon size={16} />
        </button>
      </header>
      <div className="bk-dock-body">{children}</div>
      {(actions || secondaryActions) && (
        <footer className="bk-dock-foot">
          <div className="bk-dock-foot-quiet">{secondaryActions}</div>
          <div className="bk-dock-foot-main">{actions}</div>
        </footer>
      )}
    </aside>
  );

  return host ? createPortal(node, host) : node;
}

/**
 * The column a panel docks into.
 *
 * Rendered by the page as a child of `.shell`, so the board is a SIBLING
 * that reflows rather than something the panel covers. It registers itself
 * through state (not a ref) because the panels are mounted elsewhere in the
 * tree and need a render once the element exists.
 */
export function KitDockHost({
  onHost,
}: {
  onHost: (el: HTMLElement | null) => void;
}) {
  return <div className="bk-dock-host" ref={onHost} />;
}
