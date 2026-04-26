// src/shared/presentation/theme/DeckThemePanel.tsx
//
// Composes the four Customize sections (Typography / Colors / Density /
// Style) into a single right-rail panel with a sticky header.
//
// Header items:
//   - "Reset to brand" button → calls `reset()` from useDeckTheme.
//   - Save state pill → maps `saveState` to label + color.
//
// Accordion behavior:
//   - Per-section local open state (useState inside <Accordion>).
//   - Typography opens by default; the others start collapsed.
//   - Lightweight inline component on purpose — the spec calls for
//     "lightweight inline accordions, not full radix accordion".

import { useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, RotateCcw } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';
import type { DeckKind } from './types';
import { useDeckTheme } from './useDeckTheme';
import { TypographySection } from './panels/TypographySection';
import { ColorsSection } from './panels/ColorsSection';
import { DensitySection } from './panels/DensitySection';
import { StyleSection } from './panels/StyleSection';
import type { EditorSaveState } from '@/features/editor/core';

interface Props {
  brand: Brand;
  deckKind: DeckKind;
}

const SAVE_LABEL: Record<EditorSaveState, string> = {
  idle: 'Saved',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Save failed',
};

export function DeckThemePanel({ brand, deckKind }: Props) {
  const { theme, saveState, patch, reset } = useDeckTheme(brand, deckKind);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Sticky header — reset + save state */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <button
          type="button"
          onClick={reset}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
            fontSize: 11,
            background: 'transparent',
            border: '1px solid hsl(var(--border))',
            borderRadius: 6,
            color: 'hsl(var(--muted-foreground))',
            cursor: 'pointer',
          }}
          title="Reset to brand defaults"
        >
          <RotateCcw className="w-3 h-3" /> Reset to brand
        </button>
        <span
          style={{
            fontSize: 10,
            color:
              saveState === 'error'
                ? 'hsl(var(--destructive))'
                : 'hsl(var(--muted-foreground))',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          {SAVE_LABEL[saveState]}
        </span>
      </header>

      <Accordion title="Typography" defaultOpen>
        <TypographySection theme={theme} onPatch={patch} />
      </Accordion>
      <Accordion title="Colors">
        <ColorsSection brand={brand} theme={theme} onPatch={patch} />
      </Accordion>
      <Accordion title="Density">
        <DensitySection theme={theme} onPatch={patch} />
      </Accordion>
      <Accordion title="Style">
        <StyleSection theme={theme} onPatch={patch} />
      </Accordion>
    </div>
  );
}

function Accordion({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  return (
    <section
      style={{
        borderTop: '1px solid hsl(var(--border))',
        paddingTop: 12,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 0,
          marginBottom: open ? 12 : 0,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: 'hsl(var(--muted-foreground))',
        }}
      >
        {title}
        <ChevronDown
          className="w-3 h-3"
          style={{
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease',
          }}
        />
      </button>
      {open && <div style={{ paddingBottom: 8 }}>{children}</div>}
    </section>
  );
}
