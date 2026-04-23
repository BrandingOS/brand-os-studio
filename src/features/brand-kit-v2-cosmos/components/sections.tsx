import type { Brand } from '@/shared/types/brand';

/** Shared empty state for sections with no data. */
function EmptyNote({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: '28px 20px',
        border: '1px dashed var(--dash)',
        borderRadius: 14,
        background: 'var(--surface-hover)',
        color: 'var(--text-muted)',
        fontSize: 13,
        textAlign: 'center',
      }}
    >
      {label}
    </div>
  );
}

/** ============================================================
 *  LOGO SYSTEM
 *  ============================================================ */
export function LogoSystemSection({ brand }: { brand: Brand | undefined }) {
  if (!brand) return <EmptyNote label="No brand loaded." />;

  // Collect logo slots with their source URLs.
  type LogoTile = { label: string; url: string; variant: 'light' | 'dark' };
  const tiles: LogoTile[] = [];

  const push = (label: string, url: string | undefined, variant: 'light' | 'dark' = 'light') => {
    if (!url) return;
    if (tiles.some((t) => t.url === url)) return;
    tiles.push({ label, url, variant });
  };

  push('Primary', brand.logoSystem?.primary?.url ?? brand.logoAssets?.full ?? brand.logo);
  push('Wordmark', brand.logoSystem?.wordmark?.url ?? brand.logoAssets?.wordmark);
  push('Iconmark', brand.logoSystem?.iconmark?.url ?? brand.logoAssets?.icon);
  push('Secondary', brand.logoSystem?.secondary?.url);
  push('Black', brand.logoSystem?.mono?.black?.url ?? brand.logoAssets?.dark, 'dark');
  push('White', brand.logoSystem?.mono?.white?.url ?? brand.logoAssets?.light);

  if (tiles.length === 0) {
    // Fallback text mark in brand colors.
    const bg = brand.primaryColor || '#111113';
    const fg = brand.secondaryColor || '#F1EEE4';
    return (
      <div className="logos">
        <div
          className="logo-tile"
          style={{ background: bg, color: fg }}
          aria-label={`${brand.name} placeholder logo`}
        >
          <span
            style={{
              fontFamily: '"Instrument Serif", "Playfair Display", serif',
              fontSize: 32,
              letterSpacing: '-0.01em',
              color: fg,
            }}
          >
            {brand.name}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="logos">
      {tiles.map((tile) => (
        <div
          key={`${tile.label}-${tile.url}`}
          className={`logo-tile${tile.variant === 'dark' ? ' is-dark' : ''}`}
          title={tile.label}
        >
          <img
            src={tile.url}
            alt={`${brand.name} ${tile.label} logo`}
            style={{
              maxWidth: '78%',
              maxHeight: '78%',
              objectFit: 'contain',
            }}
          />
        </div>
      ))}
    </div>
  );
}

/** ============================================================
 *  COLOR PALETTE
 *  ============================================================ */
type Swatch = { hex: string; name: string; usage?: string };

function isLightHex(hex: string): boolean {
  const clean = hex.replace('#', '');
  if (clean.length < 6) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return l > 0.6;
}

function SwatchGrid({ swatches, heading }: { swatches: Swatch[]; heading: string }) {
  if (swatches.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h3
        style={{
          fontSize: 12.5,
          color: 'var(--text-muted)',
          fontWeight: 500,
          letterSpacing: '-0.005em',
          margin: 0,
        }}
      >
        {heading}
      </h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 12,
        }}
      >
        {swatches.map((s, i) => {
          const textColor = isLightHex(s.hex) ? '#0d0d0d' : '#ffffff';
          return (
            <div
              key={`${s.hex}-${i}`}
              style={{
                borderRadius: 14,
                overflow: 'hidden',
                background: s.hex,
                color: textColor,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: 14,
                minHeight: 130,
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: '-0.01em' }}>
                {s.name}
              </div>
              <div style={{ fontSize: 11, opacity: 0.85, letterSpacing: '0.02em' }}>
                {s.hex.toUpperCase()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ColorPaletteSection({ brand }: { brand: Brand | undefined }) {
  if (!brand) return <EmptyNote label="No brand loaded." />;

  const core: Swatch[] = [];
  const primaryHex = brand.colorSystem?.primary?.hex ?? brand.primaryColor;
  const secondaryHex = brand.colorSystem?.secondary?.hex ?? brand.secondaryColor;
  const accentHex = brand.colorSystem?.accent?.hex ?? brand.accentColor;

  if (primaryHex) {
    core.push({
      hex: primaryHex,
      name: brand.colorSystem?.primary?.name ?? 'Primary',
      usage: brand.colorSystem?.primary?.usage,
    });
  }
  if (secondaryHex) {
    core.push({
      hex: secondaryHex,
      name: brand.colorSystem?.secondary?.name ?? 'Secondary',
    });
  }
  if (accentHex) {
    core.push({
      hex: accentHex,
      name: brand.colorSystem?.accent?.name ?? 'Accent',
    });
  }

  const neutrals: Swatch[] = (brand.colorSystem?.neutrals ?? []).map((n, i) => ({
    hex: n.hex,
    name: n.name ?? `Neutral ${i + 1}`,
  }));
  if (neutrals.length === 0 && brand.neutrals?.length) {
    brand.neutrals.forEach((hex, i) => {
      neutrals.push({ hex, name: `Neutral ${i + 1}` });
    });
  }

  const semantic: Swatch[] = [];
  const s = brand.colorSystem?.semantic;
  if (s?.success?.hex) semantic.push({ hex: s.success.hex, name: 'Success' });
  if (s?.warning?.hex) semantic.push({ hex: s.warning.hex, name: 'Warning' });
  if (s?.error?.hex) semantic.push({ hex: s.error.hex, name: 'Error' });
  if (s?.info?.hex) semantic.push({ hex: s.info.hex, name: 'Info' });

  if (core.length === 0 && neutrals.length === 0 && semantic.length === 0) {
    return <EmptyNote label="No colors defined yet." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <SwatchGrid swatches={core} heading="Core" />
      <SwatchGrid swatches={neutrals} heading="Neutrals" />
      <SwatchGrid swatches={semantic} heading="Semantic" />
    </div>
  );
}

/** ============================================================
 *  TYPOGRAPHY
 *  ============================================================ */
function TypeRow({
  role,
  family,
  weights,
  usage,
}: {
  role: string;
  family: string;
  weights?: string;
  usage?: string;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(160px, 220px) 1fr',
        gap: 24,
        padding: '24px 0',
        borderTop: '1px solid var(--rule)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--text-muted)',
            fontWeight: 500,
          }}
        >
          {role}
        </span>
        <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
          {family}
        </span>
        {weights && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{weights}</span>
        )}
        {usage && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {usage}
          </span>
        )}
      </div>
      <div
        style={{
          fontFamily: `"${family}", Inter, system-ui, sans-serif`,
          fontSize: 56,
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
          fontWeight: 500,
        }}
      >
        {family}
      </div>
    </div>
  );
}

export function TypographySection({ brand }: { brand: Brand | undefined }) {
  if (!brand) return <EmptyNote label="No brand loaded." />;

  const primaryFamily = brand.typography?.primary?.family ?? brand.fonts?.primary;
  const secondaryFamily = brand.typography?.secondary?.family ?? brand.fonts?.secondary;

  if (!primaryFamily && !secondaryFamily) {
    return <EmptyNote label="No typography defined yet." />;
  }

  const primaryWeights =
    brand.typography?.primary?.weights?.join(' · ') ?? 'Regular · Medium · Bold';
  const secondaryWeights =
    brand.typography?.secondary?.weights?.join(' · ') ?? 'Regular · Medium';

  return (
    <div>
      {primaryFamily && (
        <TypeRow
          role="Display"
          family={primaryFamily}
          weights={primaryWeights}
          usage={brand.typography?.primary?.usage}
        />
      )}
      {secondaryFamily && secondaryFamily !== primaryFamily && (
        <TypeRow
          role="Text"
          family={secondaryFamily}
          weights={secondaryWeights}
          usage={brand.typography?.secondary?.usage}
        />
      )}
    </div>
  );
}

/** ============================================================
 *  ICONOGRAPHY
 *  ============================================================ */
export function IconographySection({ brand }: { brand: Brand | undefined }) {
  if (!brand) return <EmptyNote label="No brand loaded." />;

  const iconography = brand.guidelines?.iconography;
  const examples = iconography?.examples ?? [];
  const total = examples.reduce((n, ex) => n + (ex.icons?.length ?? 0), 0);

  if (!iconography && total === 0) {
    return (
      <EmptyNote label="No iconography style defined yet. Icons will appear here once added." />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {iconography && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
          }}
        >
          {iconography.style && (
            <Field label="Style" value={iconography.style} />
          )}
          {iconography.weight && (
            <Field label="Weight" value={iconography.weight} />
          )}
          {iconography.cornerRadius && (
            <Field label="Corner radius" value={iconography.cornerRadius} />
          )}
        </div>
      )}
      {examples.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {examples.map((ex) => (
            <div key={ex.category}>
              <h3
                style={{
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  fontWeight: 500,
                  margin: '0 0 10px',
                }}
              >
                {ex.category}
              </h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                  gap: 8,
                }}
              >
                {(ex.icons ?? []).map((icon) => (
                  <div
                    key={icon.name}
                    style={{
                      aspectRatio: '1 / 1',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      display: 'grid',
                      placeItems: 'center',
                      background: 'var(--surface)',
                      padding: 12,
                    }}
                    title={icon.name}
                  >
                    {icon.url ? (
                      <img
                        src={icon.url}
                        alt={icon.name}
                        style={{ maxWidth: '100%', maxHeight: '100%' }}
                      />
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {icon.name}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 12,
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <span
        style={{
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: 'var(--text-muted)',
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

/** ============================================================
 *  PHOTOGRAPHY
 *  ============================================================ */
export function PhotographySection({ brand }: { brand: Brand | undefined }) {
  if (!brand) return <EmptyNote label="No brand loaded." />;

  const images: { id: string; url: string; name: string }[] = [];
  for (const asset of brand.brandAssets ?? []) {
    if (asset.kind === 'image') {
      const url =
        asset.formats?.webp?.url ??
        asset.formats?.png?.url ??
        asset.formats?.jpg?.url ??
        asset.formats?.svg?.url;
      if (url) images.push({ id: asset.id, url, name: asset.name || 'Image' });
    }
  }
  for (const asset of brand.assets ?? []) {
    if (asset.type === 'image' && !images.some((i) => i.id === asset.id)) {
      images.push({ id: asset.id, url: asset.url, name: asset.name || 'Image' });
    }
  }

  if (images.length === 0) {
    return <EmptyNote label="No photography added yet." />;
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 10,
      }}
    >
      {images.map((img) => (
        <div
          key={img.id}
          style={{
            aspectRatio: '4 / 3',
            borderRadius: 14,
            overflow: 'hidden',
            border: '1px solid var(--border)',
            background: 'var(--surface-hover)',
          }}
        >
          <img
            src={img.url}
            alt={img.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      ))}
    </div>
  );
}

/** ============================================================
 *  BRAND BOARD (read-only summary of uiStyle)
 *  ============================================================ */
export function BrandBoardSection({ brand }: { brand: Brand | undefined }) {
  if (!brand) return <EmptyNote label="No brand loaded." />;

  const ui = brand.uiStyle;
  const hasAny = !!ui || (brand.neutrals?.length ?? 0) > 0;
  if (!hasAny) {
    return <EmptyNote label="Brand Board not configured yet." />;
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12,
      }}
    >
      {ui?.borderRadius !== undefined && (
        <Field label="Border radius" value={`${ui.borderRadius}px`} />
      )}
      {ui?.shadowIntensity && (
        <Field label="Shadow" value={ui.shadowIntensity} />
      )}
      {ui?.spacing && <Field label="Spacing" value={ui.spacing} />}
      {ui?.weight && <Field label="Weight" value={ui.weight} />}
      {brand.neutrals?.length ? (
        <Field label="Neutrals" value={`${brand.neutrals.length} shades`} />
      ) : null}
    </div>
  );
}

/** ============================================================
 *  VOICE & TONE
 *  ============================================================ */
export function VoiceAndToneSection({ brand }: { brand: Brand | undefined }) {
  if (!brand) return <EmptyNote label="No brand loaded." />;

  const voice = brand.guidelines?.voiceAndTone;
  const toneText = brand.tone ?? voice?.brandVoice ?? '';
  const attrs = voice?.toneAttributes ?? [];
  const communication = voice?.communicationStyle;

  if (!toneText && attrs.length === 0 && !communication) {
    return <EmptyNote label="No voice & tone defined yet." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {toneText && (
        <p
          style={{
            fontSize: 16,
            lineHeight: 1.55,
            color: 'var(--text-primary)',
            margin: 0,
            fontFamily: '"Instrument Serif", "Playfair Display", serif',
            letterSpacing: '-0.005em',
            fontWeight: 400,
          }}
        >
          {toneText}
        </p>
      )}
      {attrs.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {attrs.map((a) => (
            <span
              key={a}
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                border: '1px solid var(--border)',
                background: 'var(--surface-elevated)',
                fontSize: 12,
                color: 'var(--text-primary)',
                letterSpacing: '-0.005em',
              }}
            >
              {a}
            </span>
          ))}
        </div>
      )}
      {communication && (
        <Field label="Communication style" value={communication} />
      )}
      {brand.audience && <Field label="Audience" value={brand.audience} />}
    </div>
  );
}
