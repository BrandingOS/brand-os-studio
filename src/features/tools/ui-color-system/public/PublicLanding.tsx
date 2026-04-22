/**
 * PublicLanding — hero for the public /tools/ui-color-system page.
 *
 * We reuse the shared ToolLanding template but with UI-color-system-
 * specific copy, features, and an empty-input launch: the tool works
 * from a hex seed, not a file. We pass the seed through the existing
 * LandingSource shape using the `svg` slot as a carrier — the page
 * component decodes it.
 */
import { useState } from 'react';
import {
  Sparkles,
  Zap,
  Palette,
  ShieldCheck,
  Copy,
  Download,
  Share2,
  Lock,
  ArrowRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isValidHex } from '@/lib/color-engine';

export interface PublicLandingProps {
  onLaunch: (seedHex: string) => void;
  defaultSeed?: string;
}

const SAMPLES: { label: string; hex: string }[] = [
  { label: 'Sky', hex: '#0ea5e9' },
  { label: 'Orange', hex: '#f97316' },
  { label: 'Emerald', hex: '#10b981' },
  { label: 'Violet', hex: '#7c3aed' },
  { label: 'Rose', hex: '#f43f5e' },
  { label: 'Amber', hex: '#f59e0b' },
];

const FEATURES = [
  {
    icon: <Zap className="h-4 w-4" />,
    title: 'Generate in seconds',
    body: 'Drop one brand color in and get a full UI color system — text, surface, buttons, semantic, charts.',
  },
  {
    icon: <ShieldCheck className="h-4 w-4" />,
    title: 'Accessibility-first',
    body: 'Every pair tested against WCAG 2 and APCA. Problems are flagged before they ship.',
  },
  {
    icon: <Palette className="h-4 w-4" />,
    title: 'Production-ready tokens',
    body: 'Export to Tailwind, CSS, SCSS, JSON, W3C tokens, HEX, HSL, RGB, OKLCH.',
  },
];

export function PublicLanding({ onLaunch, defaultSeed = '#0ea5e9' }: PublicLandingProps) {
  const [seed, setSeed] = useState(defaultSeed);
  const valid = isValidHex(seed);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <a href="/" className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" />
            BrandOS
          </a>
          <nav className="flex items-center gap-2 text-sm">
            <a href="/tools" className="text-muted-foreground hover:text-foreground">
              Tools
            </a>
            <Button variant="ghost" size="sm" onClick={() => (window.location.href = '/?signin=1')}>
              Sign in
            </Button>
            <Button size="sm" onClick={() => (window.location.href = '/?signup=1')}>
              Sign up free
            </Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 pt-16 pb-10 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          <Palette className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          Generate a complete UI color system from your brand.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
          Drop in a brand color. Get shades, semantic tokens, accessible
          pairings, realistic UI previews, and production-ready exports —
          all in one place.
        </p>

        <div
          className="mx-auto mt-10 flex max-w-xl flex-col gap-3 rounded-2xl border bg-card/80 p-4 shadow-sm sm:flex-row sm:items-center sm:p-3"
        >
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={valid ? seed : '#0ea5e9'}
              onChange={(e) => setSeed(e.target.value)}
              className="h-11 w-11 cursor-pointer rounded-md border bg-transparent p-0"
              aria-label="Seed color"
            />
            <Input
              value={seed}
              onChange={(e) => {
                const v = e.target.value;
                setSeed(v.startsWith('#') ? v : `#${v}`);
              }}
              className="h-11 flex-1 font-mono text-sm uppercase sm:w-40"
              aria-label="Seed hex"
              spellCheck={false}
              autoComplete="off"
            />
          </div>
          <Button
            size="lg"
            disabled={!valid}
            onClick={() => onLaunch(seed)}
            className="h-11 gap-2"
          >
            Generate
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>or try:</span>
          {SAMPLES.map((s) => (
            <button
              key={s.hex}
              type="button"
              onClick={() => onLaunch(s.hex)}
              className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 font-medium text-foreground transition hover:bg-muted"
            >
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: s.hex }}
              />
              {s.label}
            </button>
          ))}
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          Free to use · No signup required to start
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-14">
        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-5">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {f.icon}
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-20">
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="text-xl font-semibold">Everything you need in one place</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This isn't just a shade generator. It's a full design-system foundation.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Bullet icon={<Copy className="h-3.5 w-3.5" />} label="Semantic tokens — not just raw hex" />
            <Bullet icon={<ShieldCheck className="h-3.5 w-3.5" />} label="WCAG + APCA contrast grid" />
            <Bullet icon={<Palette className="h-3.5 w-3.5" />} label="Harmony explorer with product fit" />
            <Bullet icon={<Download className="h-3.5 w-3.5" />} label="Tailwind, CSS, JSON, W3C exports" />
            <Bullet icon={<Share2 className="h-3.5 w-3.5" />} label="Shareable public links" />
            <Bullet icon={<Sparkles className="h-3.5 w-3.5" />} label="Sync straight into a BrandOS brand" />
          </div>
        </div>
      </section>

      <footer className="border-t bg-background py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-xs text-muted-foreground sm:flex-row">
          <span>Made with BrandOS · A free tool from the BrandOS suite</span>
          <a href="/tools" className="hover:text-foreground">
            See all tools →
          </a>
        </div>
      </footer>
    </div>
  );
}

function Bullet({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </span>
      <span>{label}</span>
    </div>
  );
}
