/**
 * ExportPanel — production-ready token exports.
 *
 * Two modes, toggled at the top:
 *  - Quick (default): primary + secondary ramps only — the two pieces
 *    that are genuinely brand-specific. Neutral, tertiary, and every
 *    semantic token are skipped because they either live in the
 *    consumer's design system already or are framework defaults.
 *    CSS / HEX / Tailwind tabs.
 *  - Advanced: every role (incl. neutral + tertiary), every format,
 *    and the full semantic token layer (success / warning / surface
 *    / on-primary / …).
 *
 * Every token uses a dash-separated semantic name (`--color-primary-500`,
 * `--color-surface`). Free users get HEX + CSS variables in both modes;
 * Pro unlocks Tailwind / SCSS / JSON / W3C / HSL / RGB / OKLCH.
 */
import { useMemo, useState } from 'react';
import { Copy, Check, Download, Lock, Palette, Type, ImageIcon, Camera, Loader2 } from 'lucide-react';

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
import type { FontPair } from '../data/font-pairs';

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
  brandName?: string;
  fontPair?: FontPair | null;
  logoUrl?: string | null;
}

type ExportSection = 'colors' | 'fonts' | 'logo' | 'image';

interface RenderOpts {
  /** When false, semantic tokens (success/warning/etc.) are omitted. */
  semantics: boolean;
  /** Whitelist of palette roles to emit. Quick mode ships only the
   * brand-specific roles (primary + secondary); every other role
   * (neutral, tertiary, semantic) is either brand-agnostic or lives
   * in the consumer's design system already. */
  roles: RoleKey[];
}

const QUICK_ROLES: RoleKey[] = ['primary', 'secondary'];

export function ExportPanel({
  palette,
  canExportAdvanced,
  brandName,
  fontPair,
  logoUrl,
}: ExportPanelProps) {
  const [section, setSection] = useState<ExportSection>('colors');
  const [mode, setMode] = useState<ExportMode>('quick');
  const [kind, setKind] = useState<ExportKind>('css');
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {/* Section switch — one dialog exports everything about the
          brand, not just the palette. */}
      <div className="inline-flex self-start rounded-full border bg-muted/30 p-0.5">
        {(
          [
            { id: 'colors', label: 'Colors', Icon: Palette },
            { id: 'fonts', label: 'Fonts', Icon: Type },
            { id: 'logo', label: 'Logo', Icon: ImageIcon },
            { id: 'image', label: 'Design', Icon: Camera },
          ] as const
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              section === id
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {section === 'fonts' && (
        <FontsExport fontPair={fontPair} brandName={brandName} />
      )}
      {section === 'logo' && (
        <LogoExport logoUrl={logoUrl} brandName={brandName} />
      )}
      {section === 'image' && <DesignExport brandName={brandName} />}
      {section === 'colors' && (
        <ColorsExportBody
          palette={palette}
          canExportAdvanced={canExportAdvanced}
          mode={mode}
          setMode={setMode}
          kind={kind}
          setKind={setKind}
          copied={copied}
          setCopied={setCopied}
        />
      )}
    </div>
  );
}

// ─── Colors (existing quick/advanced export) ──────────────────

function ColorsExportBody({
  palette,
  canExportAdvanced,
  mode,
  setMode,
  kind,
  setKind,
  copied,
  setCopied,
}: {
  palette: PaletteSystem;
  canExportAdvanced: boolean;
  mode: ExportMode;
  setMode: (m: ExportMode) => void;
  kind: ExportKind;
  setKind: (k: ExportKind) => void;
  copied: boolean;
  setCopied: (b: boolean) => void;
}) {
  const availableKinds = mode === 'quick' ? QUICK_KINDS : ALL_KINDS;
  const locked = !canExportAdvanced && !FREE_KINDS.includes(kind);

  const allRoles = useMemo(
    () => (Object.keys(palette.roles) as RoleKey[]).filter((r) => palette.roles[r]),
    [palette.roles],
  );
  const opts: RenderOpts = {
    semantics: mode === 'advanced',
    roles: mode === 'quick' ? QUICK_ROLES.filter((r) => palette.roles[r]) : allRoles,
  };
  const content = useMemo(
    () => renderExport(palette, kind, opts),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [palette, kind, opts.semantics, opts.roles.join('|')],
  );

  const onModeChange = (next: ExportMode) => {
    setMode(next);
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
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-sm font-semibold">
            {mode === 'quick' ? 'Quick export' : 'Advanced export'}
          </span>
          <span className="text-xs text-muted-foreground">
            {mode === 'quick'
              ? 'Primary + secondary ramps only — paste into Tailwind / CSS.'
              : 'Every role, every format, plus semantic tokens (success, warning, surface, …).'}
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
  roles: RoleKey[],
  fn: (role: RoleKey, stop: ShadeStop, hex: string) => void,
) {
  roles.forEach((role) => {
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
      return renderTailwind(palette, opts);
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
  forEachScale(palette, opts.roles, (role, stop, hex) => {
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
  forEachScale(palette, opts.roles, (role, stop, hex) => {
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

function renderTailwind(palette: PaletteSystem, opts: RenderOpts): string {
  const colors: Record<string, Record<string, string>> = {};
  forEachScale(palette, opts.roles, (role, stop, hex) => {
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
  forEachScale(palette, opts.roles, (role, stop, hex) => {
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
  forEachScale(palette, opts.roles, (role, stop, hex) => {
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
  forEachScale(palette, opts.roles, (role, stop, hex) => {
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
  forEachScale(palette, opts.roles, (role, stop, hex) => {
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

// ─── Fonts export ─────────────────────────────────────────────

type FontKind = 'css' | 'html' | 'tailwind';

const FONT_LABELS: Record<FontKind, string> = {
  css: 'CSS',
  html: 'HTML',
  tailwind: 'Tailwind',
};

function FontsExport({
  fontPair,
  brandName,
}: {
  fontPair: FontPair | null | undefined;
  brandName?: string;
}) {
  const [kind, setKind] = useState<FontKind>('css');
  const [copied, setCopied] = useState(false);
  const content = useMemo(
    () => (fontPair ? renderFonts(fontPair, kind) : ''),
    [fontPair, kind],
  );

  if (!fontPair) {
    return (
      <p className="text-sm text-muted-foreground">
        No font pair selected. Pick one from the Fonts tab on the left panel to enable this export.
      </p>
    );
  }

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
    const ext = kind === 'tailwind' ? 'js' : kind;
    const name = brandName ? brandName.toLowerCase().replace(/[^\w-]+/g, '-') : 'brand';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}-fonts.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold">{fontPair.label}</span>
        <span className="text-xs text-muted-foreground">
          Display · <span style={{ fontFamily: fontPair.displayStack }}>{previewFontName(fontPair.displayStack)}</span>
          {' · '}
          Body · <span style={{ fontFamily: fontPair.bodyStack }}>{previewFontName(fontPair.bodyStack)}</span>
        </span>
      </div>
      <Tabs value={kind} onValueChange={(v) => setKind(v as FontKind)}>
        <TabsList>
          {(Object.keys(FONT_LABELS) as FontKind[]).map((k) => (
            <TabsTrigger key={k} value={k}>
              {FONT_LABELS[k]}
            </TabsTrigger>
          ))}
        </TabsList>
        {(Object.keys(FONT_LABELS) as FontKind[]).map((k) => (
          <TabsContent key={k} value={k} className="mt-3">
            <div className="relative rounded-xl border bg-zinc-950 font-mono text-[12px] text-zinc-100">
              <div className="absolute right-2 top-2 z-10 flex items-center gap-1.5">
                <Button size="icon" variant="secondary" onClick={doCopy} className="h-7 w-7" aria-label="Copy">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
                <Button size="icon" variant="secondary" onClick={doDownload} className="h-7 w-7" aria-label="Download">
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
              <pre className="max-h-[480px] overflow-auto whitespace-pre p-4">{content}</pre>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function renderFonts(pair: FontPair, kind: FontKind): string {
  const href = googleFontsHref(pair);
  if (kind === 'html') {
    const link = href
      ? `<link href="${href}" rel="stylesheet">\n`
      : '';
    return `${link}<style>
  :root {
    --font-display: ${pair.displayStack};
    --font-body: ${pair.bodyStack};
  }
  body { font-family: var(--font-body); }
  h1, h2, h3, h4 { font-family: var(--font-display); }
</style>`;
  }
  if (kind === 'tailwind') {
    const displayPrimary = firstFamily(pair.displayStack);
    const bodyPrimary = firstFamily(pair.bodyStack);
    return `/** Generated by BrandOS — ${pair.label} */
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        display: [${wrapFamily(displayPrimary)}, 'serif'],
        body: [${wrapFamily(bodyPrimary)}, 'sans-serif'],
      },
    },
  },
};
`;
  }
  // css
  const importLine = href ? `@import url("${href}");\n\n` : '';
  return `${importLine}:root {
  --font-display: ${pair.displayStack};
  --font-body: ${pair.bodyStack};
}

body {
  font-family: var(--font-body);
}

h1, h2, h3, h4 {
  font-family: var(--font-display);
}`;
}

function googleFontsHref(pair: FontPair): string | null {
  if (!pair.gfonts.length) return null;
  return `https://fonts.googleapis.com/css2?${pair.gfonts.map((g) => `family=${g}`).join('&')}&display=swap`;
}

function firstFamily(stack: string): string {
  const first = stack.split(',')[0].trim();
  return first.replace(/^['"]|['"]$/g, '');
}

function wrapFamily(name: string): string {
  return name.includes(' ') ? `'${name}'` : name;
}

function previewFontName(stack: string): string {
  return firstFamily(stack);
}

// ─── Logo export ──────────────────────────────────────────────

function LogoExport({
  logoUrl,
  brandName,
}: {
  logoUrl: string | null | undefined;
  brandName?: string;
}) {
  if (!logoUrl) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          No logo uploaded. Upload one from the Logo tab on the left panel to
          enable this export.
        </p>
      </div>
    );
  }

  const name = brandName ? brandName.toLowerCase().replace(/[^\w-]+/g, '-') : 'brand';
  const ext = guessExtension(logoUrl);

  const doDownload = () => {
    const a = document.createElement('a');
    a.href = logoUrl;
    a.download = `${name}-logo.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4 rounded-xl border p-4">
        <div
          className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-white"
          style={{ backgroundImage: 'repeating-conic-gradient(#f3f3f3 0% 25%, #fff 0% 50%)', backgroundSize: '12px 12px' }}
        >
          <img src={logoUrl} alt="Brand logo" style={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain' }} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-sm font-semibold">
            {brandName || 'Brand'} logo
          </span>
          <span className="text-xs text-muted-foreground">
            Downloaded as <code>{name}-logo.{ext}</code>
          </span>
        </div>
        <Button onClick={doDownload} className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          Download
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        For best results, upload a transparent PNG or SVG. Exports preserve the
        original file — no re-encoding.
      </p>
    </div>
  );
}

// ─── Design export (capture showcase as image / vector) ───────

type DesignKind = 'png' | 'jpg' | 'pdf-editable' | 'svg-editable';

const DESIGN_LABELS: Record<DesignKind, { label: string; hint: string }> = {
  png: { label: 'PNG', hint: 'High-res image · transparent' },
  jpg: { label: 'JPG', hint: 'Smaller file · solid background' },
  'pdf-editable': {
    label: 'PDF (editable)',
    hint: 'Real text + shapes — open in Illustrator',
  },
  'svg-editable': {
    label: 'SVG (editable)',
    hint: 'True vector — edit text and strokes downstream',
  },
};

/**
 * Breathing room around the showcase before we capture it. The tool's
 * main body has no padding on the edges, so capturing it produces an
 * image that's flush to every element. Wrap it in a padded container
 * first so the export reads like a presentation.
 */
const CAPTURE_PADDING_PX = 56;

function DesignExport({ brandName }: { brandName?: string }) {
  const [busy, setBusy] = useState<DesignKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const capture = async (kind: DesignKind) => {
    setBusy(kind);
    setError(null);
    try {
      const el = document.querySelector('.color-board-body') as HTMLElement | null;
      if (!el) throw new Error('No showcase on screen.');

      // Temporarily wrap the showcase in a padded container so the
      // exported frame has breathing room. We put the wrapper in the
      // same parent node as the original element so React doesn't
      // notice the DOM moved.
      const parent = el.parentElement!;
      const marker = document.createComment('uics-design-export');
      parent.insertBefore(marker, el);
      const wrapper = document.createElement('div');
      wrapper.style.padding = `${CAPTURE_PADDING_PX}px`;
      wrapper.style.background = getComputedStyle(document.body).getPropertyValue('background-color') || '#f5f4ef';
      wrapper.appendChild(el);
      parent.insertBefore(wrapper, marker);

      const name = brandName ? brandName.toLowerCase().replace(/[^\w-]+/g, '-') : 'brand';

      // When we're going editable, neuter the CSS features the
      // DOM→IR walker considers unsupported. The walker drops an
      // entire subtree when it hits any of these — every .tile has a
      // box-shadow and many have gradients, so without this the
      // vector output is empty.
      const stripStyle =
        kind === 'pdf-editable' || kind === 'svg-editable'
          ? injectVectorStripStyles(wrapper)
          : null;

      try {
        if (kind === 'png' || kind === 'jpg') {
          const { default: html2canvas } = await import('html2canvas');
          const canvas = await html2canvas(wrapper, {
            scale: 2,
            useCORS: true,
            backgroundColor: kind === 'jpg' ? '#ffffff' : null,
            logging: false,
          });
          const mime = kind === 'png' ? 'image/png' : 'image/jpeg';
          const dataUrl = canvas.toDataURL(mime, kind === 'jpg' ? 0.92 : 1);
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = `${name}-showcase.${kind}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else {
          const { exportAndDownload } = await import('@/shared/services/export');
          await exportAndDownload({
            source: { type: 'html-element', element: wrapper },
            format: kind,
            options: {
              filename: `${name}-showcase`,
              scale: 2,
              backgroundColor: '#f5f4ef',
              noRasterFallback: true,
            },
          });
        }
      } finally {
        stripStyle?.remove();
        parent.insertBefore(el, marker);
        wrapper.remove();
        marker.remove();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Capture failed.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Download the active showcase</span>
        <span className="text-xs text-muted-foreground">
          Snapshots whatever showcase is visible behind this dialog (Bento,
          Cards, Website, Social, …) with padding, so the export looks like
          a presentation frame. PNG/JPG for quick shares; PDF / SVG stay
          editable downstream.
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(DESIGN_LABELS) as DesignKind[]).map((kind) => (
          <Button
            key={kind}
            onClick={() => capture(kind)}
            disabled={busy !== null}
            variant={kind === 'png' ? 'default' : 'outline'}
            className="flex h-auto flex-col items-start gap-0.5 px-3 py-2.5 text-left"
          >
            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold">
              {busy === kind ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {DESIGN_LABELS[kind].label}
            </span>
            <span className="text-[11px] font-normal opacity-80">
              {DESIGN_LABELS[kind].hint}
            </span>
          </Button>
        ))}
      </div>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
      <p className="text-xs text-muted-foreground">
        Tip: third-party photos (Unsplash) may fail the raster canvas CORS
        check on some hosts. Editable PDF / SVG render from DOM geometry
        instead and don't hit this issue.
      </p>
    </div>
  );
}

/**
 * Temporarily strip CSS features the DOM→IR walker treats as
 * unsupported (box-shadow, gradients, filters, transforms, …).
 * Without this the walker drops entire subtrees when `noRasterFallback`
 * is on, yielding a blank PDF / SVG.
 *
 * Returns the injected <style> so the caller can remove it after
 * the export finishes.
 */
function injectVectorStripStyles(wrapper: HTMLElement): HTMLStyleElement {
  const tag = `uics-strip-${Math.random().toString(36).slice(2, 8)}`;
  wrapper.setAttribute('data-uics-strip', tag);
  const style = document.createElement('style');
  style.textContent = `
    [data-uics-strip="${tag}"],
    [data-uics-strip="${tag}"] * {
      box-shadow: none !important;
      filter: none !important;
      -webkit-filter: none !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      transform: none !important;
      -webkit-transform: none !important;
      mix-blend-mode: normal !important;
      clip-path: none !important;
      -webkit-clip-path: none !important;
      mask-image: none !important;
      -webkit-mask-image: none !important;
      background-image: none !important;
    }
  `;
  document.head.appendChild(style);
  return style;
}

function guessExtension(url: string): string {
  if (url.startsWith('data:image/svg')) return 'svg';
  if (url.startsWith('data:image/png')) return 'png';
  if (url.startsWith('data:image/jpeg') || url.startsWith('data:image/jpg')) return 'jpg';
  if (url.startsWith('data:image/webp')) return 'webp';
  const m = url.match(/\.(png|jpe?g|svg|webp|gif)(\?|$)/i);
  return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : 'png';
}
