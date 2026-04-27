/**
 * Team & Partners slide — title + Arabic intro + a single team-grid
 * image. The image is intentionally NOT recomposed from placeholders;
 * the user said "متفصلش الصورة وتحللها حطها زي ما هي" — don't break
 * down the image, put it as is. So this slide is one big slot for the
 * already-laid-out team poster (with headshots + names + roles +
 * partners) the user provides.
 *
 * To put it in: click the dashed image area on the slide once, pick
 * "Upload" in the picker, choose the screenshot from your Desktop.
 * The slide saves to localStorage so it survives reloads. You can
 * also place the file at `public/brands/uniex/team-grid.png` and the
 * default-art path below will render it without an upload.
 */

import type { CSSProperties } from 'react';
import { TEAM } from '../uniexPitchContent';
import { ReplaceableArtwork } from '../artwork/ReplaceableArtwork';
import {
  Frame,
  NAVY,
  PageChrome,
  RTL_DIR,
  SLIDE_WIDTH,
  type SlideProps,
} from './_shared';

const DEFAULT_TEAM_GRID = '/brands/uniex/team-grid.png';

export function TeamDetailSlideA({ index, total }: SlideProps) {
  return (
    <Frame index={index} variant="light">
      <PageChrome
        pageNum={index}
        total={total}
        section="الفريق والشركاء"
        variant="light"
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '170px 96px 130px',
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
        }}
      >
        {/* Title */}
        <div className="deck-h1" style={{ ...RTL_DIR, color: NAVY }}>
          {TEAM.title}
        </div>

        {/* Arabic intro + specialties + closer */}
        <div style={{ ...RTL_DIR, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="deck-body" style={{ color: 'rgba(0,21,99,0.78)' }}>
            {TEAM.intro}
          </span>
          <ul style={{ margin: 0, paddingInlineStart: 28, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {TEAM.specialties.map((s) => (
              <li key={s} className="deck-body" style={{ color: NAVY }}>
                {s}
              </li>
            ))}
          </ul>
          <span className="deck-caption" style={{ color: 'rgba(0,21,99,0.65)', marginTop: 4 }}>
            {TEAM.closer}
          </span>
        </div>

        {/* The big team poster — uploaded as a single image. */}
        <ReplaceableArtwork
          slotId="team-detail-A-grid"
          defaultQuery="team headshots board partners logos"
          style={{
            flex: 1,
            width: '100%',
            background: '#FAFBFD',
            borderRadius: 16,
            border: '1px dashed rgba(0,21,99,0.20)',
            overflow: 'hidden',
          }}
          fit="contain"
        >
          {/* If the user dropped the file at /public/brands/uniex/
              team-grid.png the default-art path renders it directly.
              Otherwise this <img> just 404s — the dashed wrapper +
              hint badge prompt the user to click + upload. */}
          <img
            src={DEFAULT_TEAM_GRID}
            alt="Team & Partners"
            onError={(e) => {
              // Fallback: hide the broken-image icon, let the parent
              // wrapper's hint badge be the only visible content.
              const el = e.currentTarget;
              el.style.display = 'none';
              const parent = el.parentElement;
              if (parent) {
                const hint = parent.querySelector('[data-team-grid-hint]');
                if (hint) (hint as HTMLElement).style.display = 'flex';
              }
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
            } satisfies CSSProperties}
          />
          <div
            data-team-grid-hint
            style={{
              display: 'none',
              position: 'absolute',
              inset: 0,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 8,
              color: 'rgba(0,21,99,0.55)',
              fontFamily: 'var(--deck-font-body)',
              fontSize: 18,
              textAlign: 'center',
              padding: 24,
              pointerEvents: 'none',
            }}
          >
            <span style={{ fontWeight: 600 }}>Click to upload your Team & Partners image</span>
            <span style={{ fontSize: 13, opacity: 0.75, maxWidth: 600 }}>
              Or save your screenshot to{' '}
              <code style={{ background: 'rgba(0,21,99,0.06)', padding: '2px 6px', borderRadius: 4 }}>
                public/brands/uniex/team-grid.png
              </code>
            </span>
          </div>
        </ReplaceableArtwork>
      </div>
    </Frame>
  );
}

export const TEAM_DETAIL_VARIANTS = {
  A: TeamDetailSlideA,
  B: TeamDetailSlideA,
  C: TeamDetailSlideA,
  D: TeamDetailSlideA,
  E: TeamDetailSlideA,
};
