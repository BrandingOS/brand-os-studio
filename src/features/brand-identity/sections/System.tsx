/**
 * The specification: what the brand is made of.
 *
 * These four sections are the reference part of the document — the pages
 * someone opens when they are about to make something and need the exact
 * value. So they are dense where the opening was airy, every value is
 * copyable, and every artefact is downloadable from beside the rule that
 * governs it.
 *
 * The specimen panel is deliberately larger than the explanation, roughly
 * 1:2.5. A brand guideline where the prose is bigger than the logo is a
 * document about itself.
 */
import type { IdentityColour, IdentityFont, IdentityModel } from '../identityModel';
import type { IdentityRegister } from '../identityRegister';
import { CopyableValue, DownloadPill, RuleCard, Section, SplitHeader } from '../components/primitives';
import { useReveal } from '../motion/useReveal';
import { useScrollVar } from '../motion/useScrollVar';
import { bgTone } from '@/shared/brand/logoOnBackground';
import {
  downloadAllColours,
  downloadAllLogos,
  downloadColour,
  downloadFont,
  downloadLogo,
} from '../download/identityDownloads';

/**
 * The mark, placed on every ground the brand owns.
 *
 * This is the section that PROVES a logo system rather than listing one, and it
 * is only honest because the variant on each ground was chosen by
 * `pickLogoOnBackground` — the single place in this codebase that decides which
 * artwork reads on which colour. A ground where nothing reaches the readability
 * floor is dropped instead of filled, which is why a brand with one dark mark
 * gets a short wall rather than a wall with an invisible square in it.
 */
function LogoWall({ model, register }: { model: IdentityModel; register: IdentityRegister }) {
  const reveal = useReveal();
  if (register.wall.length < 2) return null;
  return (
    <div
      className="bi-logo-wall"
      {...reveal}
      style={{ ...reveal.style, '--bi-wall-cols': register.wall.length } as React.CSSProperties}
    >
      {register.wall.map((cell, i) => (
        <WallCell key={cell.hex} cell={cell} name={model.name} delay={i * 70} />
      ))}
    </div>
  );
}

function WallCell({
  cell,
  name,
  delay,
}: {
  cell: { hex: string; url: string; label: string };
  name: string;
  delay: number;
}) {
  const reveal = useReveal({ delay });
  return (
    <div
      className="bi-wall-cell"
      {...reveal}
      style={{ ...reveal.style, background: cell.hex }}
    >
      <img src={cell.url} alt={`${name} logo on ${cell.label}`} />
    </div>
  );
}

export function LogoSystem({
  model,
  register,
}: {
  model: IdentityModel;
  register: IdentityRegister;
}) {
  return (
    <Section id="logo">
      <SplitHeader
        eyebrow="The marks"
        title="Logo"
        body="Every version of the mark, and where each one belongs. Use the file, never a screenshot or a redraw."
      />
      <LogoWall model={model} register={register} />
      {model.logo.variants.map((logo, i) => (
        <RuleCard
          key={logo.def.role}
          title={logo.def.label}
          body={logo.def.hint}
          delay={i * 60}
          /*
           * The ground the variant was DRAWN for — never a filter on the
           * artwork. The on-dark variant is already the light drawing; showing
           * it on white would hide it, and inverting it would show a colour the
           * brand does not own.
           */
          specimenGround={logo.def.tone}
          action={
            <DownloadPill onClick={() => void downloadLogo(model.name, logo)}>
              Download
            </DownloadPill>
          }
          specimen={<img src={logo.url} alt={`${model.name} ${logo.def.label}`} />}
        />
      ))}
      <SectionBundle onClick={() => void downloadAllLogos(model)} label="Download all logos" />
    </Section>
  );
}

export function LogoUsage({ model }: { model: IdentityModel }) {
  const { clearSpace, minSize, rules } = model.logoUsage;
  const specs = useReveal();

  return (
    <Section id="logoUsage">
      <SplitHeader
        eyebrow="Rules that protect the mark"
        title="Logo usage"
        body="The mark is the most recognisable thing the brand owns. These are the conditions it stays recognisable under."
      />
      {(clearSpace || minSize) && (
        <div className="bi-spec-row" {...specs}>
          {clearSpace && <SpecPair label="Clear space" value={clearSpace} />}
          {minSize && <SpecPair label="Minimum size" value={minSize} />}
        </div>
      )}
      {rules.length > 0 && (
        <div className="bi-rules-grid">
          {rules.map((rule, i) => (
            <UsageRule key={`${rule.do}-${i}`} rule={rule} delay={i * 70} />
          ))}
        </div>
      )}
    </Section>
  );
}

function SpecPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="bi-spec-pair">
      <span className="bi-quiet">{label}</span>
      <span className="bi-card-title">{value}</span>
    </div>
  );
}

function UsageRule({
  rule,
  delay,
}: {
  rule: { do: string; dont: string; example?: string };
  delay: number;
}) {
  const reveal = useReveal({ delay });
  return (
    <div className="bi-usage-rule" {...reveal}>
      {/* Do and don't side by side. Showing the failure mode next to the target
          teaches more than either alone — the reference's misuse grid and its
          tracking triptych are both this idea. */}
      <p className="bi-usage-do">{rule.do}</p>
      <p className="bi-usage-dont">{rule.dont}</p>
    </div>
  );
}

export function Colour({ model }: { model: IdentityModel }) {
  return (
    <Section id="colour">
      <SplitHeader
        eyebrow="The palette"
        title="Colour"
        body="Every value the brand owns, in the formats you will actually paste. Click any of them to copy."
      />
      {/*
        A field, not a row of chips.

        Colour is the one thing on this page that cannot be described, only
        shown, and it needs area to be shown in — a 60px swatch tells you the
        hue and nothing about how the colour behaves when it covers something.
        `data-count` lets the layout stay composed at two colours and at nine.
      */}
      <div className="bi-swatch-grid" data-count={model.colour.colours.length}>
        {model.colour.colours.map((colour, i) => (
          <Swatch key={colour.hex} colour={colour} brandName={model.name} delay={i * 70} />
        ))}
      </div>
      <SectionBundle onClick={() => void downloadAllColours(model)} label="Download palette" />
    </Section>
  );
}

function Swatch({
  colour,
  brandName,
  delay,
}: {
  colour: IdentityColour;
  brandName: string;
  delay: number;
}) {
  const reveal = useReveal({ delay });
  /*
   * The ink is CHOSEN, never assumed.
   *
   * Hard-coding white over the swatch is how a pale yellow brand ends up with
   * an unreadable specification. `bgTone` is the one place that decision is
   * made in this codebase.
   */
  const ink = bgTone(colour.hex) === 'dark' ? '#FFFFFF' : '#111113';

  return (
    <article
      className="bi-swatch"
      data-lead={colour.lead ? '' : undefined}
      {...reveal}
      // Merged, not spread after — the colour IS the swatch.
      style={{ ...reveal.style, background: colour.hex, color: ink }}
    >
      <div className="bi-swatch-meta">
        <span className="bi-swatch-role">{colour.role}</span>
        <CopyableValue label="HEX" value={colour.hex} />
        <CopyableValue label="RGB" value={colour.rgb} />
        <CopyableValue label="CMYK" value={colour.cmyk} />
      </div>
      <button
        type="button"
        className="bi-swatch-download"
        aria-label={`Download ${colour.role} swatch`}
        onClick={() => downloadColour(brandName, colour)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>
    </article>
  );
}

export function Typography({ model }: { model: IdentityModel }) {
  return (
    <Section id="typography">
      <SplitHeader
        eyebrow="The typefaces"
        title="Typography"
        body="Set in the brand's own faces below. What you are reading in each specimen is the real thing, not a picture of it."
      />
      {model.typography.fonts.map((font, i) => (
        <TypeSpecimen key={font.token.family} font={font} model={model} delay={i * 80} />
      ))}
    </Section>
  );
}

function TypeSpecimen({
  font,
  model,
  delay,
}: {
  font: IdentityFont;
  model: IdentityModel;
  delay: number;
}) {
  const family = `'${font.token.family}', system-ui, sans-serif`;
  const weights = font.token.weights ?? [];
  const hasFiles = font.files.length > 0;

  return (
    <RuleCard
      title={font.token.family}
      delay={delay}
      body={
        <span className="bi-type-spec">
          <span>
            <span className="bi-quiet">Role</span> {font.role}
          </span>
          {weights.length > 0 && (
            <span>
              <span className="bi-quiet">Weights</span> {weights.join(' · ')}
            </span>
          )}
          {font.token.fallbacks?.length ? (
            <span>
              <span className="bi-quiet">Fallback</span> {font.token.fallbacks.join(', ')}
            </span>
          ) : null}
          <span>
            <span className="bi-quiet">Files</span>{' '}
            {hasFiles ? `${font.files.length} uploaded` : 'Not uploaded'}
          </span>
        </span>
      }
      action={
        // Nothing to hand over when the brand only NAMED a family — a zip
        // containing a font's name is not a font.
        hasFiles ? (
          <DownloadPill onClick={() => void downloadFont(model.name, font)}>Download</DownloadPill>
        ) : undefined
      }
      specimen={
        <div className="bi-type-sample" style={{ fontFamily: family }}>
          <p className="bi-type-line" style={{ fontSize: 44, fontWeight: 600 }}>
            {model.name}
          </p>
          <p className="bi-type-alphabet">ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
          <p className="bi-type-alphabet">abcdefghijklmnopqrstuvwxyz 0123456789</p>
        </div>
      }
    />
  );
}

/** A bundle scoped to the section it closes. */
function SectionBundle({ onClick, label }: { onClick: () => void; label: string }) {
  const reveal = useReveal();
  return (
    <div className="bi-section-bundle" {...reveal}>
      <DownloadPill onClick={onClick} ghost>
        {label}
      </DownloadPill>
    </div>
  );
}
