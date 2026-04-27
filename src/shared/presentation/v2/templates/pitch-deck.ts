/**
 * Pitch Deck template — 15 slides, Arabic content sourced from
 * `src/features/pitch-deck/uniexPitchContent.ts`.
 *
 * This file is the v2 replacement for ~10K LOC of hand-coded Uniex
 * variants under `src/features/pitch-deck/variants/`. The deck renders
 * the full pitch deck through the v2 layout library without any
 * per-slide JSX — every slide is just a `{ layout, blocks }` data
 * entry that `<DeckRenderer>` knows how to draw.
 *
 * Section labels, copy, and content shape are pulled verbatim from
 * `uniexPitchContent.ts` so that module stays the single source of
 * truth for what Uniex's pitch deck says.
 */

import {
  COVER,
  PROBLEM,
  SOLUTION,
  PROCESS,
  DIFFERENTIATORS,
  FOUNDATIONS,
  PROGRAMS_INTRO,
  PROGRAMS,
  SCHOOL_BENEFITS,
  METRICS,
  IMPACT,
  TEAM,
  TEAM_DETAIL,
  CTA,
  SECTION_LABEL,
} from '@/features/pitch-deck/uniexPitchContent';
import type { Template } from '../types';

/* ─── helpers (in-file, kept tiny) ──────────────────────────────────── */

/** Compose a program-detail body string from the structured data. */
function programBody(p: {
  description: string;
  goal: string;
  phases: string[];
  outputs: string[];
}): string {
  return [
    p.description,
    `الهدف: ${p.goal}`,
    `المراحل: ${p.phases.join(' · ')}`,
    `المخرجات: ${p.outputs.join(' · ')}`,
  ].join('\n\n');
}

/** Render a "heading: items" group into a body string with bullet lines. */
function groupBody(items: string[]): string {
  return items.map((s) => `• ${s}`).join('\n');
}

/* ─── template ─────────────────────────────────────────────────────── */

export const PITCH_DECK_TEMPLATE: Template = {
  id: 'pitch-deck',
  name: 'Pitch Deck',
  description:
    'A 15-slide investor pitch — Cover → Problem → Solution → Process → Differentiators → Foundations → Programs → Metrics → Impact → Team → CTA.',
  category: 'pitch',
  slides: [
    /* 01 — Cover ───────────────────────────────────────────────────── */
    {
      layout: 'cover',
      section: SECTION_LABEL.cover,
      blocks: {
        tag: { kind: 'text', text: COVER.tag, role: 'label' },
        title: { kind: 'text', text: COVER.headline, role: 'display' },
        subtitle: { kind: 'text', text: COVER.subhead, role: 'h3' },
        image: { kind: 'image' },
        logo: { kind: 'logo', variant: 'auto' },
      },
      aiHints: {
        tag: 'Hashtag or short tagline — 2–4 words',
        title: 'Pitch headline — one strong sentence',
        subtitle: 'One-sentence elevator pitch — what + for whom',
        image: 'students learning classroom education',
      },
    },

    /* 02 — Problem ─────────────────────────────────────────────────── */
    {
      layout: 'bullets',
      section: SECTION_LABEL.problem,
      blocks: {
        title: { kind: 'text', text: PROBLEM.title, role: 'h1' },
        intro: { kind: 'text', text: PROBLEM.outcome, role: 'body' },
        bullets: {
          kind: 'list',
          role: 'body',
          items: PROBLEM.pains,
          marker: 'dot',
        },
      },
      aiHints: {
        title: 'Problem statement — one line',
        intro: 'The cost or consequence of the problem',
        bullets: 'Three concrete pain points students face',
      },
    },

    /* 03 — Solution ────────────────────────────────────────────────── */
    {
      layout: 'two-column',
      section: SECTION_LABEL.solution,
      blocks: {
        title: { kind: 'text', text: SOLUTION.title, role: 'h1' },
        leftTitle: {
          kind: 'text',
          text: SOLUTION.pillars[0].title,
          role: 'h3',
        },
        leftBody: {
          kind: 'text',
          text: SOLUTION.pillars[0].body,
          role: 'body',
        },
        rightTitle: {
          kind: 'text',
          text: SOLUTION.pillars[1].title,
          role: 'h3',
        },
        rightBody: {
          kind: 'text',
          text: `${SOLUTION.pillars[1].body}\n\n${SOLUTION.closer}`,
          role: 'body',
        },
      },
      aiHints: {
        title: 'Headline of the solution — one phrase',
        leftTitle: 'First pillar name',
        leftBody: 'What the first pillar does',
        rightTitle: 'Second pillar name',
        rightBody: 'What the second pillar does + the closer',
      },
    },

    /* 04 — Process ─────────────────────────────────────────────────── */
    {
      layout: 'process',
      section: SECTION_LABEL.process,
      blocks: {
        title: { kind: 'text', text: PROCESS.title, role: 'h1' },
        step1: {
          kind: 'text',
          text: PROCESS.phases[0].title,
          role: 'h3',
        },
        step1Body: {
          kind: 'text',
          text: PROCESS.phases[0].steps.join(' · '),
          role: 'body',
        },
        step2: {
          kind: 'text',
          text: PROCESS.phases[1].title,
          role: 'h3',
        },
        step2Body: {
          kind: 'text',
          text: [
            PROCESS.phases[1].steps.join(' · '),
            PROCESS.phases[1].footer,
          ]
            .filter(Boolean)
            .join('\n'),
          role: 'body',
        },
      },
      aiHints: {
        title: 'How the journey is built — one line',
        step1: 'First phase name',
        step1Body: 'What happens in phase 1',
        step2: 'Second phase name',
        step2Body: 'What happens in phase 2',
      },
    },

    /* 05 — Differentiators ─────────────────────────────────────────── */
    {
      layout: 'bullets',
      section: SECTION_LABEL.differentiators,
      blocks: {
        title: { kind: 'text', text: DIFFERENTIATORS.title, role: 'h1' },
        bullets: {
          kind: 'list',
          role: 'body',
          items: DIFFERENTIATORS.items,
          marker: 'check',
        },
      },
      aiHints: {
        title: 'What makes the experience different',
        bullets: 'Concrete differentiators — 4–6 items',
      },
    },

    /* 06 — Foundations ─────────────────────────────────────────────── */
    {
      layout: 'bullets',
      section: SECTION_LABEL.foundations,
      blocks: {
        title: { kind: 'text', text: FOUNDATIONS.title, role: 'h1' },
        intro: { kind: 'text', text: FOUNDATIONS.intro, role: 'body' },
        bullets: {
          kind: 'list',
          role: 'body',
          items: FOUNDATIONS.pillars.map(
            (p) => `${p.title} — ${p.body}`,
          ),
          marker: 'number',
        },
      },
      aiHints: {
        title: 'Foundation pillars headline',
        intro: 'How the pillars fit together',
        bullets: '4 foundational pillars — name + one-line description',
      },
    },

    /* 07 — Programs Intro ──────────────────────────────────────────── */
    {
      layout: 'bullets',
      section: SECTION_LABEL['programs-intro'],
      blocks: {
        title: { kind: 'text', text: PROGRAMS_INTRO.title, role: 'h1' },
        intro: { kind: 'text', text: PROGRAMS_INTRO.subtitle, role: 'body' },
        bullets: {
          kind: 'list',
          role: 'body',
          items: PROGRAMS_INTRO.paths.map(
            (p) => `${p.name} — ${p.duration} (${p.tagline})`,
          ),
          marker: 'arrow',
        },
      },
      aiHints: {
        title: 'Programs section title',
        intro: 'Why three programs — what differs between them',
        bullets: 'Each program — name, duration, tagline',
      },
    },

    /* 08 — Program Detail · Bedaya ─────────────────────────────────── */
    {
      layout: 'title-body',
      section: SECTION_LABEL['program-detail'],
      blocks: {
        label: { kind: 'text', text: PROGRAMS.bedaya.duration, role: 'label' },
        title: { kind: 'text', text: PROGRAMS.bedaya.name, role: 'h1' },
        body: { kind: 'text', text: programBody(PROGRAMS.bedaya), role: 'body' },
      },
      aiHints: {
        label: 'Program duration',
        title: 'Program name',
        body: 'Description, goal, phases, and outputs',
      },
    },

    /* 09 — Program Detail · Masar ──────────────────────────────────── */
    {
      layout: 'title-body',
      section: SECTION_LABEL['program-detail'],
      blocks: {
        label: { kind: 'text', text: PROGRAMS.masar.duration, role: 'label' },
        title: { kind: 'text', text: PROGRAMS.masar.name, role: 'h1' },
        body: { kind: 'text', text: programBody(PROGRAMS.masar), role: 'body' },
      },
      aiHints: {
        label: 'Program duration',
        title: 'Program name',
        body: 'Description, goal, phases, and outputs',
      },
    },

    /* 10 — Program Detail · Riyada ─────────────────────────────────── */
    {
      layout: 'title-body',
      section: SECTION_LABEL['program-detail'],
      blocks: {
        label: { kind: 'text', text: PROGRAMS.riyada.duration, role: 'label' },
        title: { kind: 'text', text: PROGRAMS.riyada.name, role: 'h1' },
        body: { kind: 'text', text: programBody(PROGRAMS.riyada), role: 'body' },
      },
      aiHints: {
        label: 'Program duration',
        title: 'Program name',
        body: 'Description, goal, phases, and outputs',
      },
    },

    /* 11 — School Benefits ─────────────────────────────────────────── */
    {
      layout: 'two-column',
      section: SECTION_LABEL['school-benefits'],
      blocks: {
        title: { kind: 'text', text: SCHOOL_BENEFITS.title, role: 'h1' },
        leftTitle: {
          kind: 'text',
          text: SCHOOL_BENEFITS.groups[0].heading,
          role: 'h3',
        },
        leftBody: {
          kind: 'text',
          text: groupBody(SCHOOL_BENEFITS.groups[0].items),
          role: 'body',
        },
        rightTitle: {
          kind: 'text',
          text: SCHOOL_BENEFITS.groups[1].heading,
          role: 'h3',
        },
        rightBody: {
          kind: 'text',
          text: `${groupBody(SCHOOL_BENEFITS.groups[1].items)}\n\n${SCHOOL_BENEFITS.closer}`,
          role: 'body',
        },
      },
      aiHints: {
        title: 'Headline of the value to the school',
        leftTitle: 'First benefit group',
        leftBody: 'Items in the first group',
        rightTitle: 'Second benefit group',
        rightBody: 'Items in the second group + closer',
      },
    },

    /* 12 — Metrics ─────────────────────────────────────────────────── */
    {
      layout: 'stats-3',
      section: SECTION_LABEL.metrics,
      blocks: {
        title: { kind: 'text', text: METRICS.title, role: 'h1' },
        stat1: {
          kind: 'stat',
          value: METRICS.stats[0].value,
          label: METRICS.stats[0].label,
        },
        stat2: {
          kind: 'stat',
          value: METRICS.stats[1].value,
          label: METRICS.stats[1].label,
        },
        stat3: {
          kind: 'stat',
          value: METRICS.stats[2].value,
          label: METRICS.stats[2].label,
        },
        note: { kind: 'text', text: METRICS.closer, role: 'caption' },
      },
      aiHints: {
        title: 'Metrics section headline',
        stat1: 'Top-line stat',
        stat2: 'Second stat',
        stat3: 'Third stat',
        note: 'Source / footnote / one-line closer',
      },
    },

    /* 13 — Impact (quote) ──────────────────────────────────────────── */
    {
      layout: 'quote',
      section: SECTION_LABEL.impact,
      blocks: {
        quote: {
          kind: 'quote',
          text: IMPACT.question,
        },
        attribution: { kind: 'text', text: IMPACT.caption, role: 'caption' },
        image: { kind: 'image' },
      },
      aiHints: {
        quote: 'A short, memorable line — the question the deck answers',
        attribution: 'Caption — what the visual shows',
        image: 'video thumbnail of students sharing experience',
      },
    },

    /* 14 — Team & Partners ─────────────────────────────────────────── */
    {
      layout: 'team-grid',
      section: SECTION_LABEL['team-detail'],
      blocks: {
        title: { kind: 'text', text: TEAM.title, role: 'h1' },
        intro: { kind: 'text', text: TEAM.intro, role: 'body' },

        member1: { kind: 'image' },
        member1Name: {
          kind: 'text',
          text: TEAM_DETAIL.team[0].name,
          role: 'h4',
        },
        member1Role: {
          kind: 'text',
          text: TEAM_DETAIL.team[0].role,
          role: 'caption',
        },

        member2: { kind: 'image' },
        member2Name: {
          kind: 'text',
          text: TEAM_DETAIL.team[1].name,
          role: 'h4',
        },
        member2Role: {
          kind: 'text',
          text: TEAM_DETAIL.team[1].role,
          role: 'caption',
        },

        member3: { kind: 'image' },
        member3Name: {
          kind: 'text',
          text: TEAM_DETAIL.team[2].name,
          role: 'h4',
        },
        member3Role: {
          kind: 'text',
          text: TEAM_DETAIL.team[2].role,
          role: 'caption',
        },

        member4: { kind: 'image' },
        member4Name: {
          kind: 'text',
          text: TEAM_DETAIL.board[0].name,
          role: 'h4',
        },
        member4Role: {
          kind: 'text',
          text: TEAM_DETAIL.board[0].role,
          role: 'caption',
        },

        member5: { kind: 'image' },
        member5Name: {
          kind: 'text',
          text: TEAM_DETAIL.board[1].name,
          role: 'h4',
        },
        member5Role: {
          kind: 'text',
          text: TEAM_DETAIL.board[1].role,
          role: 'caption',
        },

        member6: { kind: 'image' },
        member6Name: {
          kind: 'text',
          text: TEAM_DETAIL.board[2].name,
          role: 'h4',
        },
        member6Role: {
          kind: 'text',
          text: TEAM_DETAIL.board[2].role,
          role: 'caption',
        },
      },
      aiHints: {
        title: 'Team & Partners headline',
        intro: 'Who is behind the project — one line',
        member1: 'Headshot — CEO',
        member2: 'Headshot — COO',
        member3: 'Headshot — Operations Manager',
        member4: 'Headshot — Business Advisor',
        member5: 'Headshot — Edtech Advisor',
        member6: 'Headshot — Legal Advisor',
      },
    },

    /* 15 — CTA ─────────────────────────────────────────────────────── */
    {
      layout: 'cta',
      section: SECTION_LABEL.cta,
      blocks: {
        title: { kind: 'text', text: CTA.title, role: 'display' },
        subtitle: { kind: 'text', text: CTA.steps.join(' · '), role: 'h3' },
        primary: { kind: 'text', text: CTA.cta, role: 'label' },
        secondary: { kind: 'text', text: CTA.contact, role: 'label' },
      },
      aiHints: {
        title: 'Closing call-to-action — one strong sentence',
        subtitle: 'Steps to get started',
        primary: 'Primary button label',
        secondary: 'Secondary button label / contact',
      },
    },
  ],
};

export default PITCH_DECK_TEMPLATE;
