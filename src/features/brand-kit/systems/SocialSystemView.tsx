import { useMemo } from 'react';
import type { Brand } from '@/shared/types/brand';
import type { BrandKitTemplate } from '@/features/brandkit/types';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import { pickLogoOnBackground, pickFgOnBackground } from '@/shared/brand/logoOnBackground';
import { renderCosmosTemplate } from '../renderers';
import { aspectForType } from '../kit/registry';
import {
  SystemBand,
  SystemEmpty,
  SystemExample,
  SystemExamples,
  SystemRule,
  SystemRules,
} from './SystemLayout';

/**
 * The Social Media System.
 *
 * This replaced four cards — Profile, Cover, Post, Story — and the reason
 * is not that four is too many. It is that four cards each opening a wall
 * of variants claims the product has generated this brand's social
 * presence, and it has not. What it can honestly say is: here is how this
 * brand should behave on social, and here is that behaviour applied.
 *
 * So the view is a SYSTEM and an APPLICATION of it. The rules are derived
 * from the brand — nothing here is written by hand per brand — and the
 * examples are rendered by the very renderers the four cards used, which
 * is why removing those cards cost no work.
 *
 * Every logo-on-colour decision goes through `pickLogoOnBackground`. A
 * social system is mostly a set of coloured grounds with a mark on them,
 * which is exactly the case where a luminance test picks a primary-colour
 * mark for a primary-colour ground and the logo vanishes.
 */

/** The grounds a social post actually sits on, in the order they rank. */
function groundsOf(brand: MockBrand): Array<{ hex: string; name: string }> {
  const core = brand.colors.core ?? [];
  const accent = brand.colors.accent ?? [];
  const grounds = [...core.slice(0, 2), ...accent.slice(0, 1)].map((c) => ({
    hex: c.hex,
    name: c.name,
  }));
  // Every brand also posts on plain light and plain dark.
  return [
    ...grounds,
    { hex: '#FFFFFF', name: 'Light' },
    { hex: '#111113', name: 'Dark' },
  ].slice(0, 5);
}

/** The proportion a brand's colours should appear in on a feed. */
function proportions(brand: MockBrand) {
  const core = brand.colors.core ?? [];
  const accent = brand.colors.accent ?? [];
  const rows = [
    core[0] && { ...core[0], share: 60, role: 'Dominant' },
    core[1] && { ...core[1], share: 25, role: 'Support' },
    accent[0] && { ...accent[0], share: 15, role: 'Emphasis' },
  ].filter(Boolean) as Array<{ hex: string; name: string; share: number; role: string }>;
  if (rows.length === 0) return [];
  // Re-normalise so the bar always fills when a brand has fewer colours.
  const total = rows.reduce((sum, r) => sum + r.share, 0);
  return rows.map((r) => ({ ...r, share: Math.round((r.share / total) * 100) }));
}

/** One applied example per format, using the extended social renderers. */
const APPLIED: Array<{ caption: string; templateId: string; type: string }> = [
  { caption: 'Profile', templateId: 'profile-icons-ext-2', type: 'profile-icons' },
  { caption: 'Cover', templateId: 'facebook-covers-ext-3', type: 'facebook-covers' },
  { caption: 'Post', templateId: 'instagram-posts-ext-2', type: 'instagram-posts' },
  { caption: 'Post', templateId: 'instagram-posts-ext-7', type: 'instagram-posts' },
  { caption: 'Story', templateId: 'instagram-stories-ext-4', type: 'instagram-stories' },
];

function templateFor(id: string, type: string): BrandKitTemplate {
  return {
    id,
    name: id,
    category: 'system',
    type: type as BrandKitTemplate['type'],
    orientation: 'square',
    tags: ['social', 'system'],
  } as BrandKitTemplate;
}

export function SocialSystemView({
  brand,
  sourceBrand,
}: {
  brand: MockBrand;
  sourceBrand?: Brand;
}) {
  const grounds = useMemo(() => groundsOf(brand), [brand]);
  const ratio = useMemo(() => proportions(brand), [brand]);
  const heading = brand.fonts.find((f) => /head|display|title/i.test(f.role)) ?? brand.fonts[0];
  const body = brand.fonts.find((f) => /body|text|para/i.test(f.role)) ?? brand.fonts[1] ?? heading;

  if (ratio.length === 0 && brand.logos.length === 0) {
    return (
      <SystemEmpty
        title="Nothing to build a system from yet"
        sub="Add a logo and a colour in Setup, and this fills in."
      />
    );
  }

  return (
    <div className="bk-sys">
      <SystemBand
        title="How this brand behaves on social"
        lede="Four rules, derived from the brand. They hold whatever you are posting."
      >
        <SystemRules>
          {ratio.length > 0 && (
            <SystemRule label="Colour, in proportion" note="Per grid, not per post">
              <div className="bk-sys-ratio">
                {ratio.map((c) => (
                  <div
                    key={c.hex}
                    className="bk-sys-ratio-part"
                    style={{
                      width: `${c.share}%`,
                      background: c.hex,
                      color: pickFgOnBackground(c.hex, ['#111113', '#FFFFFF']),
                    }}
                  >
                    <span className="bk-sys-ratio-share">{c.share}%</span>
                  </div>
                ))}
              </div>
              <ul className="bk-sys-legend">
                {ratio.map((c) => (
                  <li key={c.hex} className="bk-sys-legend-item">
                    <span className="bk-sys-legend-dot" style={{ background: c.hex }} />
                    <span className="bk-sys-legend-role">{c.role}</span>
                    <span className="bk-sys-legend-name">{c.name}</span>
                    <span className="bk-sys-legend-hex">{c.hex.toUpperCase()}</span>
                  </li>
                ))}
              </ul>
            </SystemRule>
          )}

          <SystemRule label="The mark on your grounds" note="Chosen by contrast, not by habit">
            <div className="bk-sys-grounds">
              {grounds.map((ground) => {
                const logo = pickLogoOnBackground(sourceBrand, ground.hex);
                const fg = pickFgOnBackground(ground.hex, ['#111113', '#FFFFFF']);
                return (
                  <div
                    key={`${ground.name}-${ground.hex}`}
                    className="bk-sys-ground"
                    style={{ background: ground.hex, color: fg }}
                  >
                    {logo ? (
                      <img src={logo.url} alt="" className="bk-sys-ground-logo" />
                    ) : (
                      <span className="bk-sys-ground-letter">
                        {brand.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="bk-sys-ground-name">{ground.name}</span>
                  </div>
                );
              })}
            </div>
          </SystemRule>

          {heading && (
            <SystemRule label="Type on social" note="Short headline, quiet body">
              <div className="bk-sys-type">
                <span
                  className="bk-sys-type-head"
                  style={{ fontFamily: `${heading.family}, ${heading.fallback ?? 'sans-serif'}` }}
                >
                  {brand.name}
                </span>
                <span
                  className="bk-sys-type-body"
                  style={{ fontFamily: `${body?.family ?? heading.family}, sans-serif` }}
                >
                  Body copy stays one size and one weight. If a post needs a
                  second voice, it needs a second post.
                </span>
                <span className="bk-sys-type-meta">
                  {heading.family}
                  {body && body.family !== heading.family ? ` · ${body.family}` : ''}
                </span>
              </div>
            </SystemRule>
          )}

          <SystemRule label="Safe area" note="8% on every edge">
            <div className="bk-sys-safe">
              <div className="bk-sys-safe-inner">
                <span>Keep the mark and any words inside this frame.</span>
              </div>
            </div>
          </SystemRule>
        </SystemRules>
      </SystemBand>

      {sourceBrand && (
        <SystemBand
          title="The system, applied"
          lede="Real output from the rules above — not a library, one worked example per format."
        >
          <SystemExamples min={220}>
            {APPLIED.map((item, i) => (
              <SystemExample
                key={`${item.templateId}-${i}`}
                caption={item.caption}
                aspect={aspectForType(item.type)}
              >
                {renderCosmosTemplate(
                  templateFor(item.templateId, item.type),
                  sourceBrand,
                  brand,
                )}
              </SystemExample>
            ))}
          </SystemExamples>
        </SystemBand>
      )}
    </div>
  );
}
