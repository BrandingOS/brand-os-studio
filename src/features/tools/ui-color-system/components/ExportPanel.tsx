/**
 * ExportPanel — production-ready token exports.
 *
 * Two modes, toggled at the top:
 *  - Quick (default): brand ramps only (primary / secondary / neutral),
 *    no semantic tokens. CSS / HEX / Tailwind tabs. This is what most
 *    designers paste into a codebase.
 *  - Advanced: every format plus the full semantic token layer
 *    (success / warning / surface / on-primary / …).
 *
 * Every token uses a dash-separated semantic name (`--color-primary-500`,
 * `--color-surface`). Free users get HEX + CSS variables in both modes;
 * Pro unlocks Tailwind / SCSS / JSON / W3C / HSL / RGB / OKLCH.
 */
import { useMemo, useState } from 'react';
import { Copy, Check, Download, Lock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  SHADE_STOPS,
  hexToHsl,
  hexToOklch,
  hexToRgb,
  type PaletteSystem,
  type RoleKey,
  type ShadeStop,
} from '@/lib/color-engine';

type ExportKind = 'css' | 'hex' | 'tailwind' | 'scss' | 'json' | 'w3c' | 'hsl' | 'rgb' | 'oklch';
type ExportMode = 'quick' | 'advanced';

const FREE_KINDS: ExportKind[] = ['css', 'hex'];
const QUICK_KINDS: ExportKind[] = ['css', 'hex', 'tailwind'];
const ALL_KINDS: ExportKind[] = ['css', 'hex', 'tailwind', 'scss', 'json', 'w3c', 'hsl', 'rgb', 'oklch'];

const LABELS: Record<ExportKind, string> = {
  css: 'CSS variables',
  hex: 'HEX list',
  tailwind: 'Tailwind config',
  scss: 'SCSS variables',
  json: 'JSON tokens',
  w3c: 'W3C tokens',
  hsl: 'HSL',
  rgb: 'RGB',
  oklch: 'OKLCH',
};

export interface ExportPanelProps {
  palette: PaletteSystem;
  canExportAdvanced: boolean;
}

interface RenderOpts {
  /** When false, semantic tokens (success/warning/etc.) are omitted. */
  semantics: boolean;
}

export function ExportPanel({ palette, canExportAdvanced }: ExportPanelProps) {
  const [mode, setMode] = useState<ExportMode>('quick');
  const [kind, setKind] = useState<ExportKind>('css');
  const [copied, setCopied] = useState(false);

  const availableKinds = mode === 'quick' ? QUICK_KINDS : ALL_KINDS;
  const locked = !canExportAdvanced && !FREE_KINDS.includes(kind);

  const opts: RenderOpts = { semantics: mode === 'advanced' };
  const content = useMemo(() => renderExport(palette, kind, opts), [palette, kind, opts]);

  const onModeChange = (next: ExportMode) => {
    setMode(next);
    // If the active kind doesn't belong to the new mode, snap to the
    // first tab so we don't show a blank panel.
    if (next === 'quick' && !QUICK_KINDS.includes(kind)) setKind('css');
  };

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard blocked */
    }
  };

  const doDownload = () => {
    const ext = extensionFor(kind);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${palette.name.replace(/[^\w-]+/g, '-').toLowerCase()}-${kind}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Mode switch — Quick is the default, Advanced reveals every
          format + semantic tokens. */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-sm font-semibold">
            {mode === 'quick' ? 'Quick export' : 'Advanced export'}
          </span>
          <span className="text-xs text-muted-foreground">
            {mode === 'quick'
              ? 'Brand ramps only — paste into Tailwind / CSS.'
              : 'Every format, plus semantic tokens (success, warning, surface, …).'}
          </span>
        </div>
        <div className="inline-flex rounded-full border bg-muted/40 p-0.5" role="tablist" aria-label="Export depth">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'quick'}
            onClick={() => onModeChange('quick')}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              mode === 'quick' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Quick
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'advanced'}
            onClick={() => onModeChange('advanced')}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              mode === 'advanced' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Advanced
          </button>
        </div>
      </div>

      <Tabs value={kind} onValueChange={(v) => setKind(v as ExportKind)}>
        <TabsList className="flex flex-wrap">
          {availableKinds.map((k) => {
            const isLocked = !canExportAdvanced && !FREE_KINDS.includes(k);
            return (
              <TabsTrigger key={k} value={k} className="gap-1.5">
                {isLocked && <Lock className="h-3 w-3" />}
                {LABELS[k]}
              </TabsTrigger>
            );
          })}
        </TabsList>
        {availableKinds.map((k) => (
          <TabsContent key={k} value={k} className="mt-3">
            <div className="relative rounded-xl border bg-zinc-950 font-mono text-[12px] text-zinc-100">
              <div className="absolute right-2 top-2 z-10 flex items-center gap-1.5">
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={doCopy}
                  disabled={locked}
                  className="h-7 w-7"
                  aria-label="Copy to clipboard"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={doDownload}
                  disabled={locked}
                  className="h-7 w-7"
                  aria-label="Download as file"
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
              <pre
                className={cn(
                  'max-h-[480px] overflow-auto whitespace-pre p-4',
                  locked && 'select-none blur-sm',
                )}
              >
                {content}
              </pre>
              {locked && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="pointer-events-auto rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-md">
                    <Lock className="mr-1 inline-block h-3 w-3" />
                    Upgrade to unlock {LABELS[kind]}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function extensionFor(kind: ExportKind): string {
  switch (kind) {
    case 'tailwind':
      return 'js';
    case 'scss':
      return 'scss';
    case 'json':
    case 'w3c':
      return 'json';
    default:
      return 'css';
  }
}

function forEachScale(
  palette: PaletteSystem,
  fn: (role: RoleKey, stop: ShadeStop, hex: string) => void,
) {
  (Object.keys(palette.roles) as RoleKey[]).forEach((role) => {
    const scale = palette.roles[role];
    if (!scale) return;
    for (const stop of SHADE_STOPS) {
      fn(role, stop, scale.shades[stop].hex);
    }
  });
}

function renderExport(palette: PaletteSystem, kind: ExportKind, opts: RenderOpts): string {
  switch (kind) {
    case 'css':
      return renderCss(palette, opts);
    case 'hex':
      return renderHex(palette, opts);
    case 'tailwind':
      return renderTailwind(palette);
    case 'scss':
      return renderScss(palette, opts);
    case 'json':
      return renderJson(palette, opts);
    case 'w3c':
      return renderW3c(palette, opts);
    case 'hsl':
      return renderByFormat(palette, 'hsl', opts);
    case 'rgb':
      return renderByFormat(palette, 'rgb', opts);
    case 'oklch':
      return renderByFormat(palette, 'oklch', opts);
  }
}

function renderCss(palette: PaletteSystem, opts: RenderOpts): string {
  const out: string[] = [':root {'];
  forEachScale(palette, (role, stop, hex) => {
    out.push(`  --color-${role}-${stop}: ${hex};`);
  });
  if (opts.semantics) {
    for (const [k, v] of Object.entries(palette.semanticTokens)) {
      out.push(`  --color-${kebab(k)}: ${v};`);
    }
  }
  out.push('}');
  return out.join('\n');
}

function renderHex(palette: PaletteSystem, opts: RenderOpts): string {
  const out: string[] = [];
  forEachScale(palette, (role, stop, hex) => {
    out.push(`${role}-${stop}: ${hex}`);
  });
  if (opts.semantics) {
    out.push('');
    for (const [k, v] of Object.entries(palette.semanticTokens)) {
      out.push(`${kebab(k)}: ${v}`);
    }
  }
  return out.join('\n');
}

function renderTailwind(palette: PaletteSystem): string {
  const colors: Record<string, Record<string, string>> = {};
  forEachScale(palette, (role, stop, hex) => {
    colors[role] ??= {};
    colors[role][String(stop)] = hex;
  });
  return `/** Generated by BrandOS UI Color System */
module.exports = {
  theme: {
    extend: {
      colors: ${JSON.stringify(colors, null, 2)
        .replace(/"([a-z0-9-]+)":/g, '$1:')
        .replace(/"/g, "'")},
    },
  },
};
`;
}

function renderScss(palette: PaletteSystem, opts: RenderOpts): string {
  const out: string[] = [];
  forEachScale(palette, (role, stop, hex) => {
    out.push(`$color-${role}-${stop}: ${hex};`);
  });
  if (opts.semantics) {
    out.push('');
    for (const [k, v] of Object.entries(palette.semanticTokens)) {
      out.push(`$color-${kebab(k)}: ${v};`);
    }
  }
  return out.join('\n');
}

function renderJson(palette: PaletteSystem, opts: RenderOpts): string {
  const colors: Record<string, Record<string, string>> = {};
  forEachScale(palette, (role, stop, hex) => {
    colors[role] ??= {};
    colors[role][String(stop)] = hex;
  });
  return JSON.stringify(
    opts.semantics
      ? {
          name: palette.name,
          colors,
          semantic: palette.semanticTokens,
        }
      : {
          name: palette.name,
          colors,
        },
    null,
    2,
  );
}

function renderW3c(palette: PaletteSystem, opts: RenderOpts): string {
  const root: Record<string, unknown> = {};
  forEachScale(palette, (role, stop, hex) => {
    root[role] ??= {} as Record<string, unknown>;
    (root[role] as Record<string, unknown>)[String(stop)] = {
      $type: 'color',
      $value: hex,
    };
  });
  if (!opts.semantics) {
    return JSON.stringify({ color: root }, null, 2);
  }
  const semantic: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(palette.semanticTokens)) {
    semantic[k] = { $type: 'color', $value: v };
  }
  return JSON.stringify({ color: root, semantic }, null, 2);
}

function renderByFormat(palette: PaletteSystem, format: 'hsl' | 'rgb' | 'oklch', opts: RenderOpts): string {
  const lines: string[] = [];
  forEachScale(palette, (role, stop, hex) => {
    lines.push(`${role}-${stop}: ${formatColor(hex, format)}`);
  });
  if (opts.semantics) {
    lines.push('');
    for (const [k, v] of Object.entries(palette.semanticTokens)) {
      lines.push(`${kebab(k)}: ${formatColor(v, format)}`);
    }
  }
  return lines.join('\n');
}

function formatColor(hex: string, format: 'hsl' | 'rgb' | 'oklch'): string {
  if (format === 'rgb') {
    const { r, g, b } = hexToRgb(hex);
    return `rgb(${r} ${g} ${b})`;
  }
  if (format === 'hsl') {
    const { h, s, l } = hexToHsl(hex);
    return `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
  }
  const { l, c, h } = hexToOklch(hex);
  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`;
}

function kebab(camel: string): string {
  return camel.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}
