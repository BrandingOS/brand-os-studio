import type { Brand } from '@/shared/types/brand';
import { BrandLogo } from './BrandLogo';
import { Bind } from '../../content/Bind';
import { defaultPersonContent } from '../../content/kinds';
import { contrastOf, fgOn, fontStack, surface } from '@/features/brand-kit/renderers/brandStyle';

interface BusinessCardRendererProps {
  brand: Brand;
  templateIndex: number;
}

/**
 * The legacy business cards — `business-cards-1` … `business-cards-12`.
 *
 * These are the twelve entries `TEMPLATE_LIBRARY` generates, and they were
 * nine designs shown by `designs[templateIndex % designs.length]`, seven of
 * which printed the same invented person: "Jane Smith", "Vice President",
 * "+1 234 56789", "jane@<brand>.com". None of it was reachable by an edit —
 * this renderer is reached through `renderTemplateDesign`, which takes no
 * content — so a customer who typed their own name into the panel watched
 * the card go on saying somebody else's.
 *
 * All twelve ids are archived in `renderers/curation/businessCards.ts`; the
 * curated family is the 24 designs in `BusinessCardsExtended.tsx` and
 * `BusinessCardsExtended2.tsx`. What remains here is ONE honest card, drawn
 * from the brand's own defaults (`defaultPersonContent` — "Your name",
 * "Your role", and the brand's real domain, phone and address), so the
 * Classic module page still renders a real card if anything asks for one.
 *
 * `Bind` with no provider above it is an ordinary span, which is exactly
 * what this path gets. Declaring the paths costs nothing here and means the
 * card is already shaped correctly if these ids are ever brought back
 * through a content-carrying dispatch.
 */
export function BusinessCardRenderer({ brand, templateIndex }: BusinessCardRendererProps) {
  const c = defaultPersonContent(brand);

  // Even indices take the brand band, odd ones the plain sheet. One
  // decision, so twelve ids are not twelve copies of one picture.
  const banded = templateIndex % 2 === 0;
  const card = surface(brand, 'card');
  const bandBg = brand.primaryColor ?? card.text;
  const bandInk = fgOn(bandBg);
  const ink = card.text;
  const quiet = contrastOf(card.textMuted, card.bg) >= 4.5 ? card.textMuted : ink;
  const accent = contrastOf(bandBg, card.bg) >= 4.5 ? bandBg : ink;
  const head = fontStack(brand, 'heading');
  const body = fontStack(brand, 'body');
  const micro = {
    fontSize: 5.2,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    lineHeight: 1.4,
  } as const;

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden"
      style={{ background: card.bg, color: ink, fontFamily: body }}
    >
      <div
        className="flex items-center justify-between px-[8%] py-[5%]"
        style={
          banded
            ? { background: bandBg, color: bandInk }
            : { borderBottom: `1px solid ${card.border}` }
        }
      >
        <BrandLogo brand={brand} size="sm" color={banded ? bandInk : accent} />
        <div className="text-right min-w-0">
          <div style={{ ...micro, color: banded ? bandInk : quiet }}>
            <Bind path="company" value={c.company} />
          </div>
          <div style={{ fontSize: 5.2, color: banded ? bandInk : quiet }}>
            <Bind path="tagline" value={c.tagline} />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col px-[8%] pt-[5%] pb-[6%]">
        <div
          style={{
            fontFamily: head,
            fontSize: 11,
            fontWeight: 600,
            lineHeight: 1.15,
            letterSpacing: '-0.015em',
            marginTop: 'auto',
          }}
        >
          <Bind path="fullName" value={c.fullName} fit="shrink" />
          <span style={{ fontFamily: body, fontSize: 5.2, color: quiet }}>
            {c.pronouns ? ' · ' : ''}
            <Bind path="pronouns" value={c.pronouns ?? ''} />
          </span>
        </div>
        <div style={{ fontSize: 5.8, color: accent, marginTop: 1 }}>
          <Bind path="jobTitle" value={c.jobTitle} fit="shrink" />
        </div>

        <div className="flex gap-[8%]" style={{ fontSize: 5.4, marginTop: 'auto', paddingTop: 5 }}>
          <div className="min-w-0 flex flex-col gap-[1px]">
            <Bind path="email" value={c.email} />
            <Bind path="phone" value={c.phone} />
          </div>
          <div className="min-w-0 flex flex-col gap-[1px]">
            <Bind path="website" value={c.website} />
            <Bind path="socialHandle" value={c.socialHandle ?? ''} />
          </div>
        </div>
        <div style={{ fontSize: 5.1, color: quiet, marginTop: 2 }}>
          <Bind path="address" value={c.address} />
        </div>
      </div>
    </div>
  );
}
