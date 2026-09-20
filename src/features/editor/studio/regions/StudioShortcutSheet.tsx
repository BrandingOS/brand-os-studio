// The shortcut sheet — `?` opens it.
//
// Its content is `STUDIO_SHORTCUTS`, which lives beside the key handler
// rather than here. A help sheet maintained separately from the handler
// it documents drifts from it, and a shortcut list that lies is worse
// than no shortcut list.

import { DsKbd, DsModal } from '@/shared/ds';
import { STUDIO_SHORTCUTS } from '../state/useStudioHotkeys';

export function StudioShortcutSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <DsModal open={open} onClose={onClose} title="Keyboard shortcuts" size="lg">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 'var(--ds-space-5)',
        }}
      >
        {STUDIO_SHORTCUTS.map((group) => (
          <section key={group.group}>
            <h3
              style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'var(--ds-text-muted)',
                marginBottom: 10,
              }}
            >
              {group.group}
            </h3>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {group.items.map((item) => (
                <li
                  key={item.keys}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '5px 0',
                    fontSize: 12.5,
                    color: 'var(--ds-text-secondary)',
                  }}
                >
                  <span>{item.label}</span>
                  <DsKbd>{item.keys}</DsKbd>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </DsModal>
  );
}
