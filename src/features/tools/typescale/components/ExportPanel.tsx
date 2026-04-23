import { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { Typescale } from '@/shared/types/typescale';
import { ToolGate } from '@/features/tools/core';
import type { ToolMode } from '@/features/tools/core';
import {
  serializeCss, serializeTailwindV3, serializeTailwindV4, serializeScss,
  serializeJs, serializeJson, serializeW3c, serializeFigmaTokens, serializeFontSnippet,
} from '../export';

type Fmt = 'css'|'tw3'|'tw4'|'scss'|'js'|'json'|'w3c'|'figma'|'fonts';
const FORMATS: Array<[Fmt, string, (t: Typescale) => string]> = [
  ['css',   'CSS vars',       serializeCss],
  ['tw3',   'Tailwind v3',    serializeTailwindV3],
  ['tw4',   'Tailwind v4',    serializeTailwindV4],
  ['scss',  'SCSS',           serializeScss],
  ['js',    'JS/TS',          serializeJs],
  ['json',  'JSON',           serializeJson],
  ['w3c',   'W3C Tokens',     serializeW3c],
  ['figma', 'Figma Tokens',   serializeFigmaTokens],
  ['fonts', '@font-face',     serializeFontSnippet],
];

/**
 * ExportPanel — bottom drawer on the Typescale board. Collapses by
 * default to keep the preview area clean; expands to reveal format
 * pills + code pre + Copy button (cosmos accent pill).
 */
export function ExportPanel({ draft, mode = 'public' }: { draft: Typescale; mode?: ToolMode }) {
  const [fmt, setFmt] = useState<Fmt>('css');
  // Default open: the drawer is the primary action on the page so
  // opening on mount keeps the format tabs + snippet visible without an
  // extra click. Users can collapse it to reclaim vertical space.
  const [open, setOpen] = useState(true);
  const selected = FORMATS.find(([k]) => k === fmt)!;
  const content = useMemo(() => selected[2](draft), [draft, fmt]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="ts-export">
      <button
        type="button"
        className="ts-export-head"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <h3 className="ts-export-title">Export</h3>
          <span className="ts-export-subtitle">
            Copy a snippet in any format — CSS vars, Tailwind, SCSS, tokens, and more.
          </span>
        </span>
        <ChevronRight
          size={16}
          className={`ts-section-chevron${open ? ' is-open' : ''}`}
        />
      </button>

      {open && (
        <>
          <div className="ts-format-tabs" role="tablist" aria-label="Export format">
            {FORMATS.map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={k === fmt}
                onClick={() => setFmt(k)}
                className={`ts-format-tab${k === fmt ? ' is-active' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
          <pre className="ts-export-pre">{content}</pre>
          <div className="ts-export-actions">
            <ToolGate
              slug="typescale"
              mode={mode}
              feature="export-typescale"
              gates={{ 'export-typescale': 'auth' }}
              onAllowed={() => navigator.clipboard?.writeText(content).catch(() => {})}
            >
              {(trigger) => (
                <button type="button" className="ts-export-copy" onClick={trigger}>
                  Copy
                </button>
              )}
            </ToolGate>
          </div>
        </>
      )}
    </section>
  );
}
