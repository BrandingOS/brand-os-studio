import type { Brand } from '@/shared/types/brand';
import type { GuidelineSectionKey } from './GuidelineSidebar';

export type GuidelineBoardRefs = Partial<Record<GuidelineSectionKey, HTMLElement | null>>;

type Props = {
  brand: Brand;
  sectionRefs: React.MutableRefObject<GuidelineBoardRefs>;
};

/**
 * Right-hand board for the Guideline tab. Renders one editorial
 * `<Section>` per guideline key, populated from the canonical Brand
 * shape. Data sources:
 *
 *  - Strategy: `brand.guidelines.strategy`
 *  - Logo Usage: `brand.logoSystem` (v3) or `brand.logoAssets` (legacy)
 *  - Color: `brand.colorSystem` + `brand.neutrals`
 *  - Typography: `brand.typography` + `brand.guidelines.typography?.scale`
 *  - Voice & Tone: `brand.guidelines.voiceAndTone` or `brand.tone`
 *  - Photography: `brand.brandAssets` filtered by type=image
 *  - Applications: placeholder for now (no normalized app data in v3)
 *
 * Empty states mirror SetupBoard so the page never feels half-broken
 * when a brand hasn't been filled out yet.
 */
export function GuidelineBoard({ brand, sectionRefs }: Props) {
  const setRef = (key: GuidelineSectionKey) => (el: HTMLElement | null) => {
    sectionRefs.current[key] = el;
  };

  return (
    <div className="board-wrap">
      <StrategySection brand={brand} sectionRef={setRef('strategy')} />
      <LogoUsageSection brand={brand} sectionRef={setRef('logo')} />
      <ColorSection brand={brand} sectionRef={setRef('color')} />
      <TypographySection brand={brand} sectionRef={setRef('typography')} />
      <VoiceSection brand={brand} sectionRef={setRef('voice')} />
      <PhotographySection brand={brand} sectionRef={setRef('photography')} />
      <ApplicationsSection brand={brand} sectionRef={setRef('applications')} />
    </div>
  );
}

// ─── Section shell ─────────────────────────────────────────────────

function Section({
  dataKey,
  title,
  spec,
  sectionRef,
  children,
}: {
  dataKey: GuidelineSectionKey;
  title: string;
  spec: string;
  sectionRef?: (el: HTMLElement | null) => void;
  children: React.ReactNode;
}) {
  return (
    <section ref={sectionRef} className="section" data-key={dataKey}>
      <div className="section-header">
        <h2>{title}</h2>
        <span className="section-spec">{spec}</span>
      </div>
      <div className="section-body">{children}</div>
    </section>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="guideline-empty">{children}</p>;
}

// ─── Strategy ──────────────────────────────────────────────────────

function StrategySection({
  brand,
  sectionRef,
}: {
  brand: Brand;
  sectionRef: (el: HTMLElement | null) => void;
}) {
  const s = brand.guidelines?.strategy;
  const mission = s?.mission?.trim();
  const vision = s?.vision?.trim();
  const values = (s?.values ?? []).filter((v) => v?.trim().length > 0);
  const positioning = s?.positioning?.trim();
  const personality = (s?.personality ?? []).filter((p) => p?.trim().length > 0);
  const audience = s?.targetAudience?.trim() || brand.audience?.trim();

  const hasAny =
    !!mission || !!vision || values.length > 0 || !!positioning || personality.length > 0 || !!audience;

  return (
    <Section dataKey="strategy" title="Strategy" spec="Mission · Vision · Values" sectionRef={sectionRef}>
      {!hasAny && (
        <EmptyNote>
          No strategy written yet. Head to the brand studio to capture mission, vision,
          values and positioning — they'll appear here automatically.
        </EmptyNote>
      )}
      {hasAny && (
        <div className="guideline-strategy">
          {mission && (
            <div className="guideline-card">
              <span className="guideline-card-label">Mission</span>
              <p className="guideline-card-body">{mission}</p>
            </div>
          )}
          {vision && (
            <div className="guideline-card">
              <span className="guideline-card-label">Vision</span>
              <p className="guideline-card-body">{vision}</p>
            </div>
          )}
          {positioning && (
            <div className="guideline-card">
              <span className="guideline-card-label">Positioning</span>
              <p className="guideline-card-body">{positioning}</p>
            </div>
          )}
          {audience && (
            <div className="guideline-card">
              <span className="guideline-card-label">Audience</span>
              <p className="guideline-card-body">{audience}</p>
            </div>
          )}
          {values.length > 0 && (
            <div className="guideline-card guideline-card--wide">
              <span className="guideline-card-label">Values</span>
              <ul className="guideline-chips">
                {values.map((v, i) => (
                  <li key={i} className="guideline-chip">
                    {v}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {personality.length > 0 && (
            <div className="guideline-card guideline-card--wide">
              <span className="guideline-card-label">Personality</span>
              <ul className="guideline-chips">
                {personality.map((p, i) => (
                  <li key={i} className="guideline-chip">
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

// ─── Logo Usage ─────────────────────────────────────────────────────

type LogoEntry = { label: string; url: string; variant: 'light' | 'dark'; note?: string };

/**
 * Resolve a usable URL for a logo slot. Handles the back-compat shape
 * the store surfaces (where `logoSystem.primary.url` is populated by a
 * derived getter even though the canonical v3 type only holds an
 * `assetId`) — falls back to `assetId` lookup in `brandAssets` when the
 * projection hasn't been applied.
 */
function resolveLogoSlotUrl(slot: any, brand: Brand): string | undefined {
  if (!slot) return undefined;
  if (typeof slot.url === 'string' && slot.url) return slot.url;
  const id = slot.assetId;
  if (!id) return undefined;
  const asset = (brand.brandAssets ?? []).find((a: any) => a?.id === id);
  const url = resolveAssetUrl(asset);
  return url ?? undefined;
}

function collectLogos(brand: Brand): LogoEntry[] {
  const out: LogoEntry[] = [];
  const sys = brand.logoSystem;
  const assets = brand.logoAssets;

  const primary = resolveLogoSlotUrl(sys?.primary, brand) ?? assets?.full ?? brand.logo;
  const wordmark = resolveLogoSlotUrl(sys?.wordmark, brand) ?? assets?.wordmark;
  const iconmark = resolveLogoSlotUrl(sys?.iconmark, brand) ?? assets?.icon;
  const darkVersion = assets?.dark;
  const lightVersion = assets?.light;

  if (primary) {
    out.push({
      label: 'Primary',
      url: primary,
      variant: 'light',
      note: 'Default lockup. Use at a generous clearspace.',
    });
  }
  if (wordmark && wordmark !== primary) {
    out.push({
      label: 'Wordmark',
      url: wordmark,
      variant: 'light',
      note: 'Text-only. Use when the mark is redundant.',
    });
  }
  if (iconmark && iconmark !== primary) {
    out.push({
      label: 'Mark',
      url: iconmark,
      variant: 'dark',
      note: 'Icon-only. Use for favicons and app tiles.',
    });
  }
  if (darkVersion && darkVersion !== primary) {
    out.push({
      label: 'Dark background',
      url: darkVersion,
      variant: 'dark',
      note: 'Use on dark or photographic surfaces.',
    });
  }
  if (lightVersion && lightVersion !== primary && lightVersion !== darkVersion) {
    out.push({
      label: 'Light background',
      url: lightVersion,
      variant: 'light',
      note: 'Use on light or neutral surfaces.',
    });
  }
  return out;
}

function LogoUsageSection({
  brand,
  sectionRef,
}: {
  brand: Brand;
  sectionRef: (el: HTMLElement | null) => void;
}) {
  const logos = collectLogos(brand);
  const primaryColor = brand.colorSystem?.primary?.hex ?? brand.primaryColor ?? '#F1EEE4';
  const secondaryColor = brand.colorSystem?.secondary?.hex ?? brand.secondaryColor ?? '#111113';

  const rules = brand.guidelines?.logoSystem?.usage ?? [];
  const clearSpace = brand.guidelines?.logoSystem?.clearSpace;
  const minSize = brand.guidelines?.logoSystem?.minSize;

  return (
    <Section
      dataKey="logo"
      title="Logo Usage"
      spec={`${logos.length || 0} variant${logos.length === 1 ? '' : 's'}`}
      sectionRef={sectionRef}
    >
      {logos.length === 0 && (
        <EmptyNote>
          No logo files uploaded yet. Upload a primary lockup in Setup — variants and
          usage notes will appear here once it's in the system.
        </EmptyNote>
      )}
      {logos.length > 0 && (
        <div className="guideline-logo-grid">
          {logos.map((logo, i) => (
            <div key={`${logo.label}-${i}`} className="guideline-logo-tile">
              <div
                className="guideline-logo-plate"
                data-variant={logo.variant}
                style={{
                  background: logo.variant === 'dark' ? secondaryColor : primaryColor,
                }}
              >
                <img src={logo.url} alt={logo.label} />
              </div>
              <div className="guideline-logo-meta">
                <span className="guideline-logo-label">{logo.label}</span>
                {logo.note && <span className="guideline-logo-note">{logo.note}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {(clearSpace || minSize || rules.length > 0) && (
        <div className="guideline-rules">
          {clearSpace && (
            <div className="guideline-card">
              <span className="guideline-card-label">Clear space</span>
              <p className="guideline-card-body">{clearSpace}</p>
            </div>
          )}
          {minSize && (
            <div className="guideline-card">
              <span className="guideline-card-label">Minimum size</span>
              <p className="guideline-card-body">{minSize}</p>
            </div>
          )}
          {rules.length > 0 && (
            <div className="guideline-dos-donts">
              <div className="guideline-dos">
                <span className="guideline-dos-label">Do</span>
                <ul>
                  {rules.map((r, i) => (
                    <li key={`do-${i}`}>{r.do}</li>
                  ))}
                </ul>
              </div>
              <div className="guideline-donts">
                <span className="guideline-donts-label">Don't</span>
                <ul>
                  {rules.map((r, i) => (
                    <li key={`dont-${i}`}>{r.dont}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

// ─── Color ─────────────────────────────────────────────────────────

function relLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  if (clean.length < 6) return 1;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function ColorSwatch({ hex, name }: { hex: string; name: string }) {
  const isLight = relLuminance(hex) > 0.6;
  return (
    <div className="guideline-swatch" style={{ background: hex }}>
      <div className={`guideline-swatch-meta${isLight ? ' is-on-light' : ''}`}>
        <span className="guideline-swatch-name">{name}</span>
        <span className="guideline-swatch-hex">{hex.toUpperCase()}</span>
      </div>
    </div>
  );
}

function ColorSection({
  brand,
  sectionRef,
}: {
  brand: Brand;
  sectionRef: (el: HTMLElement | null) => void;
}) {
  // `colorSystem` is the v3 canonical palette — `primary`, `secondary`,
  // `accent` (singular), `neutrals[]`. We project it into three editorial
  // buckets (core / accent / neutrals) for the guideline surface.
  const cs = brand.colorSystem;
  const core: Array<{ hex: string; name: string }> = [];
  const primaryHex = cs?.primary?.hex ?? brand.primaryColor;
  const secondaryHex = cs?.secondary?.hex ?? brand.secondaryColor;

  if (primaryHex) core.push({ hex: primaryHex, name: cs?.primary?.name ?? 'Primary' });
  if (secondaryHex) core.push({ hex: secondaryHex, name: cs?.secondary?.name ?? 'Secondary' });

  const accents: Array<{ hex: string; name: string }> = [];
  const accentHex = brand.accentColor ?? cs?.accent?.hex;
  if (accentHex) accents.push({ hex: accentHex, name: cs?.accent?.name ?? 'Accent' });

  // Prefer the canonical `colorSystem.neutrals` when present; fall back
  // to the legacy `brand.neutrals` array on older brands.
  const neutrals: Array<{ hex: string; name: string }> =
    cs?.neutrals && cs.neutrals.length > 0
      ? cs.neutrals.map((n, i) => ({ hex: n.hex, name: n.name ?? `Neutral ${i + 1}` }))
      : (brand.neutrals ?? []).map((hex, i) => ({ hex, name: `Neutral ${i + 1}` }));

  const hasAny = core.length + accents.length + neutrals.length > 0;

  return (
    <Section dataKey="color" title="Color" spec="Palette · Usage" sectionRef={sectionRef}>
      {!hasAny && (
        <EmptyNote>
          No palette defined yet. Pick a primary in Setup and the guideline will show
          your core, accent, and neutral families with usage notes.
        </EmptyNote>
      )}
      {core.length > 0 && (
        <div className="guideline-palette">
          <div className="guideline-palette-head">
            <span className="guideline-palette-label">Core</span>
            <span className="guideline-palette-hint">Primary brand colors. Use for dominant surfaces and calls to action.</span>
          </div>
          <div className="guideline-palette-row">
            {core.map((c, i) => (
              <ColorSwatch key={`core-${i}`} hex={c.hex} name={c.name} />
            ))}
          </div>
        </div>
      )}
      {accents.length > 0 && (
        <div className="guideline-palette">
          <div className="guideline-palette-head">
            <span className="guideline-palette-label">Accent</span>
            <span className="guideline-palette-hint">Use sparingly to direct attention and reinforce hierarchy.</span>
          </div>
          <div className="guideline-palette-row">
            {accents.map((c, i) => (
              <ColorSwatch key={`acc-${i}`} hex={c.hex} name={c.name} />
            ))}
          </div>
        </div>
      )}
      {neutrals.length > 0 && (
        <div className="guideline-palette">
          <div className="guideline-palette-head">
            <span className="guideline-palette-label">Neutrals</span>
            <span className="guideline-palette-hint">Grounding shades for text, surfaces, and dividers.</span>
          </div>
          <div className="guideline-palette-row">
            {neutrals.map((c, i) => (
              <ColorSwatch key={`n-${i}`} hex={c.hex} name={c.name} />
            ))}
          </div>
        </div>
      )}
      {hasAny && (
        <div className="guideline-dos-donts">
          <div className="guideline-dos">
            <span className="guideline-dos-label">Do</span>
            <ul>
              <li>Lead with the Primary color for brand-defining surfaces.</li>
              <li>Keep generous contrast between text and background.</li>
            </ul>
          </div>
          <div className="guideline-donts">
            <span className="guideline-donts-label">Don't</span>
            <ul>
              <li>Use accents as the dominant background.</li>
              <li>Stack low-contrast neutrals on text-heavy layouts.</li>
            </ul>
          </div>
        </div>
      )}
    </Section>
  );
}

// ─── Typography ────────────────────────────────────────────────────

function TypographySection({
  brand,
  sectionRef,
}: {
  brand: Brand;
  sectionRef: (el: HTMLElement | null) => void;
}) {
  const primary = brand.typography?.primary?.family ?? brand.fonts?.primary;
  const secondary = brand.typography?.secondary?.family ?? brand.fonts?.secondary;
  const primaryWeights = brand.typography?.primary?.weights;
  const secondaryWeights = brand.typography?.secondary?.weights;

  const scale = brand.guidelines?.typography?.scale;

  const hasAny = !!primary || !!secondary;

  return (
    <Section dataKey="typography" title="Typography" spec="Type system · Scale" sectionRef={sectionRef}>
      {!hasAny && (
        <EmptyNote>
          Pick a primary and secondary font in Setup to surface a live type scale here.
        </EmptyNote>
      )}
      {primary && (
        <div className="guideline-type">
          <div className="guideline-type-head">
            <span className="guideline-type-role">Display</span>
            <span className="guideline-type-family">{primary}</span>
            {primaryWeights && primaryWeights.length > 0 && (
              <span className="guideline-type-weights">{primaryWeights.join(' · ')}</span>
            )}
          </div>
          <div className="guideline-type-sample" style={{ fontFamily: `"${primary}", serif` }}>
            <span style={{ fontSize: '56px', lineHeight: 1.02, letterSpacing: '-0.02em' }}>
              {brand.name}
            </span>
          </div>
        </div>
      )}
      {secondary && secondary !== primary && (
        <div className="guideline-type">
          <div className="guideline-type-head">
            <span className="guideline-type-role">Text</span>
            <span className="guideline-type-family">{secondary}</span>
            {secondaryWeights && secondaryWeights.length > 0 && (
              <span className="guideline-type-weights">{secondaryWeights.join(' · ')}</span>
            )}
          </div>
          <div className="guideline-type-sample" style={{ fontFamily: `"${secondary}", sans-serif` }}>
            <p style={{ fontSize: '18px', lineHeight: 1.5, margin: 0 }}>
              Clear, grounded copy that carries the brand. Use this face for body,
              captions, and anything the reader is actually reading.
            </p>
          </div>
        </div>
      )}
      {scale && (
        <div className="guideline-scale">
          <span className="guideline-scale-label">Scale</span>
          <div className="guideline-scale-grid">
            {(['h1', 'h2', 'h3', 'body', 'caption'] as const).map((key) => {
              // FontScale's keys are all strings, but TS sees the interface
              // as exact. Go via `unknown` to dip into it by name.
              const size = (scale as unknown as Record<string, string | undefined>)[key];
              if (!size) return null;
              return (
                <div key={key} className="guideline-scale-row">
                  <span className="guideline-scale-name">{key.toUpperCase()}</span>
                  <span className="guideline-scale-size">{size}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Section>
  );
}

// ─── Voice & Tone ──────────────────────────────────────────────────

function VoiceSection({
  brand,
  sectionRef,
}: {
  brand: Brand;
  sectionRef: (el: HTMLElement | null) => void;
}) {
  const v = brand.guidelines?.voiceAndTone;
  const brandVoice = v?.brandVoice?.trim() || brand.tone?.trim();
  const toneAttrs = (v?.toneAttributes ?? []).filter((t) => t?.trim().length > 0);
  const communication = v?.communicationStyle?.trim();
  const dos = (v?.doAndDonts?.do ?? []).filter((d) => d?.trim().length > 0);
  const donts = (v?.doAndDonts?.dont ?? []).filter((d) => d?.trim().length > 0);
  const examples = (v?.examples ?? []).filter((e) => e?.good || e?.bad);

  const hasAny =
    !!brandVoice ||
    toneAttrs.length > 0 ||
    !!communication ||
    dos.length > 0 ||
    donts.length > 0 ||
    examples.length > 0;

  return (
    <Section dataKey="voice" title="Voice & Tone" spec="How we speak" sectionRef={sectionRef}>
      {!hasAny && (
        <EmptyNote>
          Describe how the brand speaks in Setup — adjectives, tone attributes, do's and
          don'ts — and it'll render here as a reviewable voice brief.
        </EmptyNote>
      )}
      {brandVoice && (
        <div className="guideline-card guideline-card--wide">
          <span className="guideline-card-label">Brand voice</span>
          <p className="guideline-card-body">{brandVoice}</p>
        </div>
      )}
      {toneAttrs.length > 0 && (
        <div className="guideline-card guideline-card--wide">
          <span className="guideline-card-label">Tone attributes</span>
          <ul className="guideline-chips">
            {toneAttrs.map((t, i) => (
              <li key={i} className="guideline-chip">
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}
      {communication && (
        <div className="guideline-card guideline-card--wide">
          <span className="guideline-card-label">Communication style</span>
          <p className="guideline-card-body">{communication}</p>
        </div>
      )}
      {(dos.length > 0 || donts.length > 0) && (
        <div className="guideline-dos-donts">
          <div className="guideline-dos">
            <span className="guideline-dos-label">Do</span>
            <ul>
              {dos.map((d, i) => (
                <li key={`do-${i}`}>{d}</li>
              ))}
            </ul>
          </div>
          <div className="guideline-donts">
            <span className="guideline-donts-label">Don't</span>
            <ul>
              {donts.map((d, i) => (
                <li key={`dont-${i}`}>{d}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {examples.length > 0 && (
        <div className="guideline-examples">
          <span className="guideline-card-label">Examples</span>
          {examples.map((e, i) => (
            <div key={i} className="guideline-example">
              {e.context && <span className="guideline-example-context">{e.context}</span>}
              {e.good && (
                <p className="guideline-example-good">
                  <span>Good</span> {e.good}
                </p>
              )}
              {e.bad && (
                <p className="guideline-example-bad">
                  <span>Avoid</span> {e.bad}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// ─── Photography ───────────────────────────────────────────────────

/**
 * Resolve a best-effort URL from either a legacy `Asset` (has `.url` and
 * `.type`) or a v3 `BrandAsset` (has `.kind` and `.formats[format].url`).
 * The store may project either shape depending on migration state, so we
 * accept both.
 */
function resolveAssetUrl(asset: any): string | null {
  if (!asset) return null;
  if (typeof asset.url === 'string' && asset.url) return asset.url;
  const formats = asset.formats;
  if (formats && typeof formats === 'object') {
    const preferred = ['webp', 'jpg', 'png', 'svg'] as const;
    for (const f of preferred) {
      const file = formats[f];
      if (file?.url) return file.url;
    }
    for (const key of Object.keys(formats)) {
      const file = formats[key];
      if (file?.url) return file.url;
    }
  }
  return null;
}

function isImageAsset(asset: any): boolean {
  if (!asset) return false;
  return asset.type === 'image' || asset.kind === 'image';
}

function PhotographySection({
  brand,
  sectionRef,
}: {
  brand: Brand;
  sectionRef: (el: HTMLElement | null) => void;
}) {
  const images = (brand.brandAssets ?? [])
    .filter(isImageAsset)
    .map((a: any) => ({ id: a.id as string, name: a.name as string | undefined, url: resolveAssetUrl(a) }))
    .filter((a): a is { id: string; name: string | undefined; url: string } => !!a.url)
    .slice(0, 8);

  return (
    <Section
      dataKey="photography"
      title="Photography"
      spec={`${images.length} reference${images.length === 1 ? '' : 's'}`}
      sectionRef={sectionRef}
    >
      {images.length === 0 && (
        <EmptyNote>
          Drop reference photography into the brand's assets and it'll appear here as a
          mood board — directional for shoots, licensing, and style.
        </EmptyNote>
      )}
      {images.length > 0 && (
        <div className="guideline-photo-grid">
          {images.map((img) => (
            <div key={img.id} className="guideline-photo-tile">
              <img src={img.url} alt={img.name ?? ''} loading="lazy" />
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// ─── Applications ──────────────────────────────────────────────────

function ApplicationsSection({
  brand,
  sectionRef,
}: {
  brand: Brand;
  sectionRef: (el: HTMLElement | null) => void;
}) {
  const apps = brand.guidelines?.applications;
  const buckets: Array<{ label: string; items: Array<{ name: string; description?: string; image?: string }> }> = [];
  if (apps?.digital?.length) buckets.push({ label: 'Digital', items: apps.digital });
  if (apps?.print?.length) buckets.push({ label: 'Print', items: apps.print });
  if (apps?.packaging?.length) buckets.push({ label: 'Packaging', items: apps.packaging });
  if (apps?.environmental?.length) buckets.push({ label: 'Environmental', items: apps.environmental });

  const hasAny = buckets.length > 0;

  return (
    <Section dataKey="applications" title="Applications" spec="In the wild" sectionRef={sectionRef}>
      {!hasAny && (
        <EmptyNote>
          Applications — digital, print, packaging, and environmental — will surface here
          once templates are saved in the brand. Use the Design tab to start one.
        </EmptyNote>
      )}
      {hasAny && (
        <div className="guideline-apps">
          {buckets.map((b) => (
            <div key={b.label} className="guideline-apps-bucket">
              <span className="guideline-card-label">{b.label}</span>
              <div className="guideline-apps-grid">
                {b.items.map((item, i) => (
                  <div key={`${b.label}-${i}`} className="guideline-app-tile">
                    {item.image ? (
                      <img src={item.image} alt={item.name} loading="lazy" />
                    ) : (
                      <div className="guideline-app-placeholder">{item.name?.slice(0, 2) ?? '—'}</div>
                    )}
                    <div className="guideline-app-meta">
                      <span className="guideline-app-name">{item.name}</span>
                      {item.description && (
                        <span className="guideline-app-desc">{item.description}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
