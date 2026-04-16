/**
 * Brand Portal v2 — Frontify-style public brand portal.
 *
 * Mounted at /p/:slug. Fully public (no auth). Renders a brand's identity
 * as a beautiful landing page: cover hero, quick links, palette, type
 * specimen, voice, contact.
 *
 * v5 PRD Phase 5.
 */
import * as React from 'react';
import { useParams } from 'react-router-dom';
import { useBrandStore } from '@/shared/store/brandStore';
import { logoUrl } from '@/shared/brand/logoUrl';
import { ArrowRight, Download, Mail, Sparkles, Palette as PaletteIcon, Type, Megaphone, Layers } from 'lucide-react';

export default function BrandPortalV2Page() {
  const { slug } = useParams<{ slug: string }>();
  const { current, loadBySlug, isLoading } = useBrandStore();

  React.useEffect(() => {
    if (slug) loadBySlug(slug);
  }, [slug, loadBySlug]);

  if (isLoading || !current) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading portal…</div>
      </div>
    );
  }

  const brand = current;
  const primary = brand.primaryColor || '#7c3aed';
  const secondary = brand.secondaryColor || '#06b6d4';

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Cover hero */}
      <header className="relative overflow-hidden">
        {/* Aurora */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full opacity-50 blur-[120px]" style={{ backgroundColor: primary }} />
          <div className="absolute -right-40 top-20 h-[480px] w-[480px] rounded-full opacity-40 blur-[140px]" style={{ backgroundColor: secondary }} />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground backdrop-blur">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: primary }} />
            Brand Portal
          </div>

          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <div className="mb-6 flex items-center gap-4">
                {logoUrl(brand) ? (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-background p-2.5">
                    <img src={logoUrl(brand)} alt={brand.name} className="max-h-full max-w-full object-contain" />
                  </div>
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-bold text-white shadow-2xl" style={{ backgroundColor: primary }}>
                    {brand.name?.[0]}
                  </div>
                )}
              </div>
              <h1 className="font-display text-5xl font-bold tracking-[-0.03em] md:text-7xl">{brand.name}</h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
                {brand.guidelines?.strategy?.positioning ||
                  `${brand.tone}, made for ${brand.audience}. The complete brand system, in one place.`}
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="group inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-2xl transition hover:-translate-y-0.5"
                  style={{ backgroundColor: primary }}
                >
                  Explore the brand
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-3 text-sm font-medium text-foreground backdrop-blur transition hover:border-foreground/40"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download brand kit
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Quick links */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="mb-6 font-display text-2xl font-semibold tracking-[-0.01em]">Brand essentials</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <PortalLink icon={Layers} label="Logo" subtitle={`${countLogoVariants(brand)} variants`} accent={primary} />
          <PortalLink icon={PaletteIcon} label="Colors" subtitle="Palette & usage" accent={primary} />
          <PortalLink icon={Type} label="Typography" subtitle={brand.fonts?.primary || 'Type system'} accent={primary} />
          <PortalLink icon={Megaphone} label="Voice" subtitle={brand.tone} accent={primary} />
        </div>
      </section>

      {/* Palette */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="mb-6 font-display text-2xl font-semibold tracking-[-0.01em]">Color palette</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <ColorCard label="Primary" value={primary} />
          {brand.secondaryColor && <ColorCard label="Secondary" value={brand.secondaryColor} />}
          <ColorCard label="Background" value="#0a0a0f" />
          <ColorCard label="Foreground" value="#fafafa" />
        </div>
      </section>

      {/* Typography */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="mb-6 font-display text-2xl font-semibold tracking-[-0.01em]">Typography</h2>
        <div className="rounded-3xl border border-border bg-card p-10">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Display</div>
          <div className="mt-2 font-display text-5xl font-bold tracking-[-0.03em]" style={{ fontFamily: brand.fonts?.primary }}>
            {brand.name}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{brand.fonts?.primary || 'Plus Jakarta Sans'}</div>

          <div className="mt-8 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Body</div>
          <p className="mt-2 max-w-xl text-base leading-relaxed text-foreground" style={{ fontFamily: brand.fonts?.secondary || brand.fonts?.primary }}>
            The quick brown fox jumps over the lazy dog. Brand voice and typographic rhythm shape how a message lands before any word is read.
          </p>
        </div>
      </section>

      {/* Voice */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="mb-6 font-display text-2xl font-semibold tracking-[-0.01em]">Voice & audience</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Tone</div>
            <div className="mt-2 font-display text-2xl font-semibold">{brand.tone}</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Audience</div>
            <div className="mt-2 font-display text-2xl font-semibold">{brand.audience}</div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="overflow-hidden rounded-3xl border border-border bg-card p-10 md:p-14">
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Get in touch</div>
              <h3 className="mt-2 font-display text-3xl font-bold tracking-[-0.02em]">Need access or assets?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Reach out to the brand team for licensed downloads, partnerships, or co-marketing.
              </p>
            </div>
            <a
              href="mailto:brand@example.com"
              className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-2xl transition hover:-translate-y-0.5"
              style={{ backgroundColor: primary }}
            >
              <Mail className="h-3.5 w-3.5" />
              Contact brand team
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3 w-3 text-primary" />
            Powered by <span className="font-semibold text-foreground">BrandOS</span>
          </div>
          <div>© {new Date().getFullYear()} {brand.name}</div>
        </div>
      </footer>
    </div>
  );
}

function PortalLink({
  icon: Icon,
  label,
  subtitle,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  subtitle: string;
  accent: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-1 hover:border-foreground/20 hover:shadow-2xl">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-30 blur-2xl transition group-hover:opacity-60" style={{ backgroundColor: accent }} />
      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background">
        <Icon className="h-4 w-4 text-foreground" />
      </div>
      <div className="relative mt-4">
        <div className="text-base font-semibold text-foreground">{label}</div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</div>
      </div>
    </div>
  );
}

function ColorCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="aspect-[5/3] w-full" style={{ backgroundColor: value }} />
      <div className="p-3">
        <div className="text-sm font-semibold text-foreground">{label}</div>
        <div className="font-mono text-[11px] text-muted-foreground">{value.toUpperCase()}</div>
      </div>
    </div>
  );
}

function countLogoVariants(brand: { logoAssets?: Record<string, string | undefined>; logo?: string }): number {
  const variants = brand.logoAssets ?? {};
  let n = 0;
  for (const k of Object.keys(variants)) if (variants[k]) n++;
  if (n === 0 && brand.logo) n = 1;
  return n;
}
