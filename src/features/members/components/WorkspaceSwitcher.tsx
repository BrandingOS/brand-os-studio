// ============================================================================
// Switching between workspaces (docs/access-architecture/10 §1).
//
// Three rules, each of which is the fix for a specific way this goes wrong:
//
//  • It mounts in `WorkspaceShellAlt` (dashboard, settings) and `WorkspaceShell` (brand
//    scope) — NEVER in `AppRail`, which is Classic and bug-fix only.
//  • It is hidden for anyone with one workspace, and for every guest. A client invited to
//    look at one brand should not have to learn the word "workspace".
//  • Switching clears the brand map BEFORE loading the next one (accessStore does this),
//    so one tenant's shape never shows on another's screen for even a frame.
// ============================================================================
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronsUpDown } from 'lucide-react';
import { DsMenu, DsMenuItem } from '@/shared/ds';
import { useAccessStore, useCurrentWorkspace, useWorkspaces, WORKSPACE_ROLE_LABEL } from '@/shared/access';

export function WorkspaceSwitcher() {
  const workspaces = useWorkspaces();
  const current = useCurrentWorkspace();
  const setCurrent = useAccessStore((s) => s.setCurrentWorkspace);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // One workspace is not a choice; a guest has no business meeting the concept.
  if (!current || workspaces.length < 2 || current.role === 'guest') return null;

  const pick = async (id: string) => {
    setOpen(false);
    if (id === current.id) return;
    await setCurrent(id);
    // The brands on screen belong to the workspace we just left.
    navigate('/dashboard');
  };

  const ordered = [...workspaces].sort(
    (a, b) => Number(b.isPersonal) - Number(a.isPersonal) || a.name.localeCompare(b.name),
  );

  return (
    <div className="ws-switcher" ref={wrap}>
      <button
        type="button"
        className="ws-switcher-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ws-switcher-name">{current.name}</span>
        <ChevronsUpDown size={14} strokeWidth={1.8} aria-hidden />
      </button>
      {open && (
        <div className="ws-switcher-pop">
          <DsMenu aria-label="Switch workspace">
            {ordered.map((w) => (
              <DsMenuItem
                key={w.id}
                onClick={() => void pick(w.id)}
                icon={w.id === current.id ? <Check size={14} strokeWidth={1.8} aria-hidden /> : <span />}
              >
                <span className="ws-switcher-item">
                  <span>{w.name}</span>
                  <span className="ws-switcher-role">{WORKSPACE_ROLE_LABEL[w.role]}</span>
                </span>
              </DsMenuItem>
            ))}
          </DsMenu>
        </div>
      )}
      <style>{`
        .ws-switcher { position: relative; }
        .ws-switcher-trigger {
          display: inline-flex; align-items: center; gap: 6px;
          border: 1px solid var(--ds-border-subtle, rgba(0,0,0,.08));
          background: var(--ds-surface, #fff); color: inherit;
          border-radius: 999px; padding: 4px 10px; font-size: 13px; cursor: pointer;
          max-width: 220px;
        }
        .ws-switcher-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ws-switcher-pop { position: absolute; left: 0; top: calc(100% + 6px); z-index: 60; min-width: 220px; }
        .ws-switcher-item { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; }
        .ws-switcher-role { color: var(--ds-text-muted, #6b6b6b); font-size: 12px; }
      `}</style>
    </div>
  );
}
