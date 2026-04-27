/**
 * Team Detail slide — the "Team / Board Member / Partners" grid that
 * matches the layout from the user's reference screenshot.
 *
 * Two row groups (Team + Board Member) each anchored by a coloured
 * vertical tab on the side, three round headshots per group. Below
 * the rows: a partners strip with three logos.
 *
 * Every photo + every partner logo is a `ReplaceableArtwork` slot,
 * so the user can click a circle / logo and upload the real asset
 * (or pick from Unsplash) without touching code.
 */

import type { CSSProperties } from 'react';
import { TEAM, TEAM_DETAIL } from '../uniexPitchContent';
import { ReplaceableArtwork } from '../artwork/ReplaceableArtwork';
import {
  Frame,
  GREEN,
  NAVY,
  PageChrome,
  RTL_DIR,
  type SlideProps,
  WHITE,
} from './_shared';

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
          gap: 36,
        }}
      >
        {/* Title row */}
        <div className="deck-h1" style={{ ...RTL_DIR, color: NAVY }}>
          {TEAM.title}
        </div>

        {/* Two-group row: Team (navy tab) + Board Member (green tab) */}
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 56,
            alignItems: 'flex-start',
          }}
        >
          <PeopleGroup
            label="Team"
            tabColor={NAVY}
            people={TEAM_DETAIL.team}
            slotPrefix="team-detail-A-team"
            defaultQuery="professional headshot portrait"
          />
          <PeopleGroup
            label="Board Member"
            tabColor={GREEN}
            people={TEAM_DETAIL.board}
            slotPrefix="team-detail-A-board"
            defaultQuery="business advisor portrait"
          />
        </div>

        {/* Partners strip */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <span className="deck-label" style={{ color: 'rgba(0,21,99,0.5)' }}>
            Partners
          </span>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 32,
              alignItems: 'center',
            }}
          >
            {TEAM_DETAIL.partners.map((p) => (
              <PartnerCell
                key={p.id}
                name={p.name}
                slotId={`team-detail-A-partner-${p.id}`}
              />
            ))}
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ───────────────────── helpers ───────────────────── */

function PeopleGroup({
  label,
  tabColor,
  people,
  slotPrefix,
  defaultQuery,
}: {
  label: string;
  tabColor: string;
  people: Array<{ id: string; name: string; role: string }>;
  slotPrefix: string;
  defaultQuery: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
      {/* Vertical color tab with rotated label */}
      <div
        style={{
          alignSelf: 'stretch',
          minWidth: 44,
          background: tabColor,
          borderRadius: 6,
          padding: '14px 8px',
          color: WHITE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            fontFamily: 'var(--deck-font-heading)',
            fontWeight: 700,
            fontSize: 16,
            color: WHITE,
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
      </div>

      {/* People row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 18,
          flex: 1,
        }}
      >
        {people.map((p) => (
          <PersonCell
            key={p.id}
            name={p.name}
            role={p.role}
            slotId={`${slotPrefix}-${p.id}`}
            defaultQuery={defaultQuery}
          />
        ))}
      </div>
    </div>
  );
}

function PersonCell({
  name,
  role,
  slotId,
  defaultQuery,
}: {
  name: string;
  role: string;
  slotId: string;
  defaultQuery: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        textAlign: 'center',
      }}
    >
      <ReplaceableArtwork
        slotId={slotId}
        defaultQuery={defaultQuery}
        style={{
          width: 168,
          height: 168,
          borderRadius: 999,
          overflow: 'hidden',
          background: '#EFF1F6',
          border: '1px solid rgba(0,21,99,0.10)',
        }}
        fit="cover"
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            color: 'rgba(0,21,99,0.4)',
            fontFamily: 'var(--deck-font-heading)',
            fontWeight: 700,
            fontSize: 48,
          }}
        >
          {name.charAt(0)}
        </span>
      </ReplaceableArtwork>
      <span
        style={{
          fontFamily: 'var(--deck-font-heading)',
          fontWeight: 700,
          fontSize: 20,
          color: NAVY,
          lineHeight: 1.2,
        }}
      >
        {name}
      </span>
      <span
        style={{
          fontFamily: 'var(--deck-font-body)',
          fontWeight: 600,
          fontSize: 14,
          color: 'rgba(0,21,99,0.65)',
          lineHeight: 1.3,
        }}
      >
        {role}
      </span>
    </div>
  );
}

function PartnerCell({ name, slotId }: { name: string; slotId: string }) {
  return (
    <ReplaceableArtwork
      slotId={slotId}
      defaultQuery={`${name} logo`}
      style={
        {
          width: '100%',
          height: 80,
          background: '#FAFBFD',
          border: '1px dashed rgba(0,21,99,0.18)',
          borderRadius: 12,
          padding: '8px 14px',
        } satisfies CSSProperties
      }
      fit="contain"
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          fontFamily: 'var(--deck-font-heading)',
          fontWeight: 700,
          fontSize: 18,
          letterSpacing: '0.02em',
          color: 'rgba(0,21,99,0.6)',
          textAlign: 'center',
        }}
      >
        {name}
      </span>
    </ReplaceableArtwork>
  );
}

export const TEAM_DETAIL_VARIANTS = {
  A: TeamDetailSlideA,
  B: TeamDetailSlideA,
  C: TeamDetailSlideA,
  D: TeamDetailSlideA,
  E: TeamDetailSlideA,
};
