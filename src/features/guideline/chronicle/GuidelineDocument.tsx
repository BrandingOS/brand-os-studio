/* Brand Guideline document rendered as a Chronicle-style multi-page
 * scroll. Each section is a "page" (`.ch-canvas-page`) so the canvas
 * stage scrolls smoothly between Cover · Strategy · Logo · Color ·
 * Typography · Voice · Photography · Applications.
 *
 * The document is intentionally read-only for now — the floating bottom
 * Insert / Remix / Theme / Background bar shows what editing will look
 * like, but the actual edit operations come in the next pass. Brand
 * data flows in via the `brand` prop; missing sections render a
 * placeholder card instead of being hidden, so empty brands still feel
 * like a complete document outline.
 */

import { useMemo } from "react";
import type { Brand } from "@/shared/types/brand";

interface Props {
  brand: Brand;
  /** Theme accent — overrides the brand's primary when set. */
  accent?: string;
}

export function GuidelineDocument({ brand, accent }: Props) {
  const a = accent ?? brand.primaryColor ?? "#d4a83c";
  const headFont =
    brand.typography?.primary?.family ?? brand.fonts?.primary ?? "Inter";
  const bodyFont =
    brand.typography?.secondary?.family ?? brand.fonts?.secondary ?? "Inter";

  const colors = useMemo(() => collectColors(brand), [brand]);
  const logoCount = useMemo(() => countLogos(brand), [brand]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
        padding: "40px 0",
        width: "100%",
        alignItems: "center",
      }}
    >
      <CoverPage brand={brand} accent={a} headFont={headFont} />
      <StrategyPage brand={brand} accent={a} headFont={headFont} bodyFont={bodyFont} />
      <LogoPage brand={brand} accent={a} headFont={headFont} logoCount={logoCount} />
      <ColorPage colors={colors} accent={a} headFont={headFont} />
      <TypographyPage
        accent={a}
        headFont={headFont}
        bodyFont={bodyFont}
      />
      <VoicePage brand={brand} accent={a} headFont={headFont} bodyFont={bodyFont} />
    </div>
  );
}

/* ─── pages ────────────────────────────────────────────────────────────── */

function CoverPage({
  brand,
  accent,
  headFont,
}: {
  brand: Brand;
  accent: string;
  headFont: string;
}) {
  return (
    <article className="ch-canvas-page" style={{ minHeight: "78vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <span style={{ fontSize: 13, color: "var(--ch-text-faint)", letterSpacing: ".08em", marginBottom: 24 }}>
        BRAND GUIDELINES · 2026
      </span>
      <h1
        className="ch-canvas-page-title"
        style={{ fontFamily: headFont, fontSize: "clamp(48px, 7vw, 96px)", margin: 0 }}
      >
        A guideline for{" "}
        <span
          style={{
            background: `linear-gradient(120deg, ${accent}66 0%, transparent 70%)`,
            padding: "0 0.2em",
            borderRadius: 12,
            boxShadow: `0 0 80px 12px ${accent}40`,
          }}
        >
          {brand.name}
        </span>
        .
      </h1>
      <p
        className="ch-canvas-page-sub"
        style={{ marginTop: 32, fontSize: 17, maxWidth: "62ch" }}
      >
        {brand.tagline ?? brand.description ?? "How to look, sound, and feel like us — everywhere."}
      </p>
    </article>
  );
}

function StrategyPage({
  brand,
  accent,
  headFont,
  bodyFont,
}: {
  brand: Brand;
  accent: string;
  headFont: string;
  bodyFont: string;
}) {
  const mission = brand.guidelines?.strategy?.mission ?? brand.mission ?? "—";
  const vision = brand.guidelines?.strategy?.vision ?? brand.vision ?? "—";
  const values = brand.guidelines?.strategy?.values?.filter(Boolean) ?? brand.values ?? [];

  return (
    <article className="ch-canvas-page">
      <SectionHeader index="01" label="Strategy" accent={accent} headFont={headFont} />
      <h2 style={{ fontFamily: headFont, fontSize: 36, margin: "8px 0 32px", letterSpacing: "-0.02em" }}>
        Why we exist.
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, fontFamily: bodyFont }}>
        <div>
          <h3 style={{ fontSize: 13, color: "var(--ch-text-faint)", marginBottom: 8, fontWeight: 500 }}>
            MISSION
          </h3>
          <p style={{ fontSize: 18, lineHeight: 1.5, margin: 0 }}>{mission}</p>
        </div>
        <div>
          <h3 style={{ fontSize: 13, color: "var(--ch-text-faint)", marginBottom: 8, fontWeight: 500 }}>
            VISION
          </h3>
          <p style={{ fontSize: 18, lineHeight: 1.5, margin: 0 }}>{vision}</p>
        </div>
      </div>
      {values.length > 0 ? (
        <div style={{ marginTop: 40 }}>
          <h3 style={{ fontSize: 13, color: "var(--ch-text-faint)", marginBottom: 12, fontWeight: 500 }}>
            VALUES
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {values.map((v, i) => (
              <span
                key={i}
                style={{
                  padding: "6px 14px",
                  borderRadius: 999,
                  border: "1px solid var(--ch-border-strong)",
                  fontSize: 14,
                  fontFamily: bodyFont,
                }}
              >
                {v}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function LogoPage({
  brand,
  accent,
  headFont,
  logoCount,
}: {
  brand: Brand;
  accent: string;
  headFont: string;
  logoCount: number;
}) {
  const primaryLogo = brand.logoAssets?.full ?? brand.logo;
  return (
    <article className="ch-canvas-page">
      <SectionHeader index="02" label="Logo" accent={accent} headFont={headFont} />
      <h2 style={{ fontFamily: headFont, fontSize: 36, margin: "8px 0 32px", letterSpacing: "-0.02em" }}>
        The mark, in {logoCount || 1} variation{logoCount === 1 ? "" : "s"}.
      </h2>
      <div
        style={{
          aspectRatio: "16/9",
          background: "var(--ch-canvas-bg)",
          border: "1px solid var(--ch-border)",
          borderRadius: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {primaryLogo ? (
          <img
            src={primaryLogo}
            alt={`${brand.name} logo`}
            style={{ maxWidth: "55%", maxHeight: "55%", objectFit: "contain" }}
          />
        ) : (
          <span style={{ fontFamily: headFont, fontSize: 64, fontWeight: 700 }}>
            {brand.name}
          </span>
        )}
      </div>
      <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            style={{
              aspectRatio: "1",
              borderRadius: 12,
              background: i === 0 ? "#0a0a0b" : i === 1 ? "#ffffff" : i === 2 ? accent : "var(--ch-canvas-bg)",
              border: "1px solid var(--ch-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: i === 1 ? "#0a0a0b" : "#ffffff",
              fontFamily: headFont,
              fontWeight: 600,
            }}
          >
            {brand.name?.slice(0, 1)}
          </div>
        ))}
      </div>
    </article>
  );
}

function ColorPage({
  colors,
  accent,
  headFont,
}: {
  colors: Array<{ name: string; hex: string }>;
  accent: string;
  headFont: string;
}) {
  return (
    <article className="ch-canvas-page">
      <SectionHeader index="03" label="Color" accent={accent} headFont={headFont} />
      <h2 style={{ fontFamily: headFont, fontSize: 36, margin: "8px 0 32px", letterSpacing: "-0.02em" }}>
        Our palette.
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
        {colors.map((c, i) => (
          <div
            key={i}
            style={{
              borderRadius: 14,
              overflow: "hidden",
              border: "1px solid var(--ch-border)",
            }}
          >
            <div style={{ background: c.hex, aspectRatio: "1.2/1" }} />
            <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</span>
              <span style={{ fontSize: 11.5, color: "var(--ch-text-faint)", fontFamily: "ui-monospace, monospace" }}>
                {c.hex.toUpperCase()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function TypographyPage({
  accent,
  headFont,
  bodyFont,
}: {
  accent: string;
  headFont: string;
  bodyFont: string;
}) {
  return (
    <article className="ch-canvas-page">
      <SectionHeader index="04" label="Typography" accent={accent} headFont={headFont} />
      <h2 style={{ fontFamily: headFont, fontSize: 36, margin: "8px 0 32px", letterSpacing: "-0.02em" }}>
        How we read.
      </h2>
      <div
        style={{
          padding: 28,
          borderRadius: 16,
          background: "var(--ch-canvas-bg)",
          border: "1px solid var(--ch-border)",
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 11.5, color: "var(--ch-text-faint)", marginBottom: 8 }}>
          PRIMARY · {headFont}
        </div>
        <div style={{ fontFamily: headFont, fontSize: 64, lineHeight: 1, fontWeight: 600, letterSpacing: "-0.02em" }}>
          Aa
        </div>
        <div style={{ fontFamily: headFont, fontSize: 18, marginTop: 12 }}>
          The quick brown fox jumps over the lazy dog.
        </div>
      </div>
      <div
        style={{
          padding: 28,
          borderRadius: 16,
          background: "var(--ch-canvas-bg)",
          border: "1px solid var(--ch-border)",
        }}
      >
        <div style={{ fontSize: 11.5, color: "var(--ch-text-faint)", marginBottom: 8 }}>
          SECONDARY · {bodyFont}
        </div>
        <div style={{ fontFamily: bodyFont, fontSize: 64, lineHeight: 1, fontWeight: 400 }}>
          Aa
        </div>
        <div style={{ fontFamily: bodyFont, fontSize: 18, marginTop: 12 }}>
          The quick brown fox jumps over the lazy dog.
        </div>
      </div>
    </article>
  );
}

function VoicePage({
  brand,
  accent,
  headFont,
  bodyFont,
}: {
  brand: Brand;
  accent: string;
  headFont: string;
  bodyFont: string;
}) {
  const voice =
    brand.guidelines?.voiceAndTone?.brandVoice ??
    brand.tone ??
    "Confident. Warm. Direct. We speak like a thoughtful friend who knows the craft.";
  const tones = brand.guidelines?.voiceAndTone?.toneAttributes ?? [];

  return (
    <article className="ch-canvas-page">
      <SectionHeader index="05" label="Voice & Tone" accent={accent} headFont={headFont} />
      <h2 style={{ fontFamily: headFont, fontSize: 36, margin: "8px 0 32px", letterSpacing: "-0.02em" }}>
        How we sound.
      </h2>
      <p style={{ fontFamily: bodyFont, fontSize: 22, lineHeight: 1.45, margin: 0, maxWidth: "60ch" }}>
        {voice}
      </p>
      {tones.length > 0 ? (
        <div style={{ marginTop: 36, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {tones.map((t, i) => (
            <span
              key={i}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                border: "1px solid var(--ch-border-strong)",
                fontSize: 14,
                fontFamily: bodyFont,
              }}
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

/* ─── helpers ──────────────────────────────────────────────────────────── */

function SectionHeader({
  index,
  label,
  accent,
  headFont,
}: {
  index: string;
  label: string;
  accent: string;
  headFont: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontFamily: headFont, fontSize: 11, color: accent, letterSpacing: ".12em", fontWeight: 600 }}>
        {index}
      </span>
      <span style={{ fontFamily: headFont, fontSize: 11, color: "var(--ch-text-faint)", letterSpacing: ".12em", fontWeight: 500 }}>
        {label.toUpperCase()}
      </span>
    </div>
  );
}

function collectColors(brand: Brand): Array<{ name: string; hex: string }> {
  const out: Array<{ name: string; hex: string }> = [];
  if (brand.colorSystem?.primary?.hex) {
    out.push({ name: brand.colorSystem.primary.name ?? "Primary", hex: brand.colorSystem.primary.hex });
  } else if (brand.primaryColor) {
    out.push({ name: "Primary", hex: brand.primaryColor });
  }
  if (brand.colorSystem?.secondary?.hex) {
    out.push({ name: brand.colorSystem.secondary.name ?? "Secondary", hex: brand.colorSystem.secondary.hex });
  } else if (brand.secondaryColor) {
    out.push({ name: "Secondary", hex: brand.secondaryColor });
  }
  if (brand.accentColor) {
    out.push({ name: "Accent", hex: brand.accentColor });
  }
  (brand.neutrals ?? []).forEach((n, i) => {
    if (typeof n === "string") {
      out.push({ name: `Neutral ${i + 1}`, hex: n });
    } else if (n?.hex) {
      out.push({ name: n.name ?? `Neutral ${i + 1}`, hex: n.hex });
    }
  });
  if (out.length === 0) {
    out.push(
      { name: "Ink", hex: "#0a0a0b" },
      { name: "Paper", hex: "#f5f5f4" },
      { name: "Gold", hex: "#d4a83c" },
    );
  }
  return out;
}

function countLogos(brand: Brand): number {
  return (
    (brand.logoSystem?.primary ? 1 : 0) +
    (brand.logoSystem?.wordmark ? 1 : 0) +
    (brand.logoSystem?.iconmark ? 1 : 0) +
    (brand.logoAssets?.full ? 1 : 0) +
    (brand.logoAssets?.wordmark ? 1 : 0) +
    (brand.logoAssets?.icon ? 1 : 0)
  );
}
