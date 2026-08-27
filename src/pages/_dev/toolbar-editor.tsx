/**
 * Toolbar editor — /_dev/toolbar-editor
 *
 * One small EDITOR with every toolbar we have, working for real (owner
 * request 2026-08-23): the CanvasToolbar (Insert menu with hover
 * previews), and per-selection the ChartToolbar, CardToolbar and the
 * text/image FloatingToolbars — the same CanvasSandbox the elements lab
 * mounts, promoted to a full page and pre-seeded so every bar is one
 * click away.
 *
 * The machinery is NOT duplicated: `CanvasSandbox` is imported from the
 * elements lab — one sandbox, two homes.
 *
 * Self-gated: DEV builds, or `?dev=1`. Never linked from user nav.
 */
import { useEffect, useState } from 'react';
import { WorkspaceShell } from '@/shared/layouts/WorkspaceShell';
import { CanvasSandbox, type SandboxSeed } from './elements';

/** One block per toolbar family, spread out with room to drag. */
const SEED: SandboxSeed[] = [
  { widget: 'text:display', x: 48, y: 32 },
  { widget: 'chart:column', x: 560, y: 60 },
  { widget: 'card:vertical', x: 48, y: 170 },
  { widget: 'media:image', x: 330, y: 200 },
];

export default function DevToolbarEditorPage() {
  const allowed =
    import.meta.env.DEV || new URLSearchParams(window.location.search).has('dev');
  if (!allowed) {
    return (
      <div style={{ padding: 48, fontFamily: 'system-ui' }}>
        <h1>Toolbar editor</h1>
        <p>
          This page is only available in development. Append <code>?dev=1</code> to
          force-enable.
        </p>
      </div>
    );
  }
  return <Lab />;
}

function Lab() {
  // The canvas claims the viewport under the top bar and the header.
  const [height, setHeight] = useState(() => Math.max(560, window.innerHeight - 240));
  useEffect(() => {
    const onResize = () => setHeight(Math.max(560, window.innerHeight - 240));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <WorkspaceShell>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 4px 40px' }}>
        <header className="gl-doc-head">
          <div>
            <span className="gl-doc-eyebrow">Dev · Lab</span>
            <h1 className="gl-doc-title">Toolbar editor</h1>
          </div>
          <div className="gl-doc-meta">
            <span>
              insert from the bar · select a block for its own toolbar — chart, card, text,
              image
            </span>
          </div>
        </header>
        <div style={{ marginTop: 16 }}>
          <CanvasSandbox chrome={false} height={height} seed={SEED} />
        </div>
      </div>
    </WorkspaceShell>
  );
}
