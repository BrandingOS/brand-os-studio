import { useMemo, useState } from 'react';
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

export function ExportPanel({ draft, mode = 'public' }: { draft: Typescale; mode?: ToolMode }) {
  const [fmt, setFmt] = useState<Fmt>('css');
  const selected = FORMATS.find(([k]) => k === fmt)!;
  const content = useMemo(() => selected[2](draft), [draft, fmt]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h3 className="text-sm font-medium">Export</h3>
      <div className="flex flex-wrap gap-1 text-xs">
        {FORMATS.map(([k, label]) => (
          <button key={k} onClick={() => setFmt(k)}
            className={`px-2 py-1 rounded ${k===fmt?'bg-primary text-primary-foreground':'bg-muted'}`}>
            {label}
          </button>
        ))}
      </div>
      <pre className="max-h-64 overflow-auto rounded border bg-muted/30 p-2 text-[11px] leading-snug">{content}</pre>
      <div className="flex gap-2">
        <ToolGate
          slug="typescale"
          mode={mode}
          feature="export-typescale"
          gates={{ 'export-typescale': 'auth' }}
          onAllowed={() => navigator.clipboard?.writeText(content).catch(() => {})}
        >
          {(trigger) => (
            <button
              className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground"
              onClick={trigger}
            >
              Copy
            </button>
          )}
        </ToolGate>
      </div>
    </section>
  );
}
