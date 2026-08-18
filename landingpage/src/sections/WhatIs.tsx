/**
 * Chapter 01 — What BrandingOS is (ink).
 *
 * The argument is performed, not written. A rhythmic ledger sets up the
 * gap; then one pinned scene does the work: the brand-as-folder — nine
 * scattered dots buried under file chips — assembles, on scroll, into
 * the mark with its four connections (what it means / looks like /
 * belongs to it / how it's created). Chaos → System, the identity's
 * own signature, as the product explanation.
 */
import { useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from 'framer-motion';
import { ChapterHead, reveal } from './shared';

/* ── The two formations (lab geometry, 220 viewBox) ─────────────── */

const V = 220;
const C = V / 2;

const ring = (n: number, r: number, phase = 0) =>
  Array.from({ length: n }, (_, i) => {
    const a = phase + (i / n) * Math.PI * 2;
    return { x: C + Math.cos(a) * r, y: C + Math.sin(a) * r };
  });

const CHAOS = [
  { x: 28, y: 44 }, { x: 186, y: 30 }, { x: 66, y: 118 },
  { x: 148, y: 84 }, { x: 38, y: 182 }, { x: 118, y: 32 },
  { x: 196, y: 152 }, { x: 92, y: 196 }, { x: 158, y: 190 },
];
const SYSTEM = [...ring(8, 78, -Math.PI / 2 + Math.PI / 8), { x: C, y: C }];

/* ── The folder's contents (phase A chips) ──────────────────────── */

/* offsets are PIXELS from the mark's centre (percentages would
   resolve against the chip's own box and pile everything up) */
const CHIPS: { label: string; x: number; y: number; r: number; soft?: boolean }[] = [
  { label: 'logo_final_v3.ai', x: -150, y: -110, r: -7 },
  { label: 'palette.png', x: 120, y: -140, r: 5 },
  { label: 'guidelines.pdf', x: -180, y: 20, r: 4 },
  { label: 'fonts.zip', x: 170, y: -20, r: -4 },
  { label: 'brand_voice.docx', x: -120, y: 130, r: 6 },
  { label: '“how it feels” — in someone’s head', x: 110, y: 150, r: -5, soft: true },
];

/* ── The system's four holds (phase B connections) ──────────────── */

const HOLDS_LEFT = ['What it means', 'What belongs to it'];
const HOLDS_RIGHT = ['What it looks like', 'How it’s created'];

function Hold({ text, side, on }: { text: string; side: 'l' | 'r'; on: boolean }) {
  return (
    <motion.div
      animate={{ opacity: on ? 1 : 0, x: on ? 0 : side === 'l' ? -14 : 14 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`flex items-center gap-4 ${side === 'l' ? '' : 'flex-row-reverse'}`}
    >
      <span className="microlabel whitespace-nowrap opacity-80">{text}</span>
      <span className="h-px w-10 bg-white/25 md:w-16" />
    </motion.div>
  );
}

/* ── The pinned scene ───────────────────────────────────────────── */

function FolderToSystem() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  const [phase, setPhase] = useState(0); // 0 = folder chaos · 1 = the system
  useMotionValueEvent(scrollYProgress, 'change', (v) =>
    setPhase(v > 0.42 ? 1 : 0),
  );
  const on = reduced ? 1 : phase;
  const pts = on ? SYSTEM : CHAOS;

  return (
    <div ref={ref} className="relative h-[220vh]">
      <div className="sticky top-0 flex h-svh flex-col items-center justify-center overflow-hidden px-6">
        {/* stage */}
        <div className="flex items-center justify-center gap-4 md:gap-8">
          {/* left holds */}
          <div className="hidden flex-col items-end gap-10 md:flex">
            {HOLDS_LEFT.map((t) => (
              <Hold key={t} text={t} side="l" on={on === 1} />
            ))}
          </div>

          {/* the mark — chips over scattered dots, then the system */}
          <div className="relative">
            <svg
              viewBox={`0 0 ${V} ${V}`}
              className="h-[240px] w-[240px] overflow-visible text-panel-foreground md:h-[320px] md:w-[320px]"
              fill="currentColor"
              aria-hidden="true"
            >
              {pts.map((pt, i) => (
                <motion.circle
                  key={i}
                  r={on === 1 && i === 8 ? 11 : 8}
                  initial={false}
                  animate={{ cx: pt.x, cy: pt.y }}
                  transition={{
                    type: 'spring',
                    stiffness: 60,
                    damping: 15,
                    mass: 1,
                    delay: i * 0.035,
                  }}
                />
              ))}
            </svg>

            {/* the folder's files, pinned over the mess. Outer span owns
                the -50% self-centering; framer owns only the inner
                offsets — the two transforms compose across elements. */}
            {CHIPS.map((chip) => (
              <span
                key={chip.label}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              >
                <motion.span
                  initial={false}
                  animate={
                    on === 1
                      ? {
                          opacity: 0,
                          x: chip.x * 2.4,
                          y: chip.y * 2.4,
                          rotate: chip.r * 2,
                          scale: 0.9,
                        }
                      : {
                          opacity: 1,
                          x: chip.x,
                          y: chip.y,
                          rotate: chip.r,
                          scale: 1,
                        }
                  }
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className={`block whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[11px] md:text-xs ${
                    chip.soft
                      ? 'serif-accent border-white/20 bg-transparent text-panel-foreground/75'
                      : 'border-white/15 bg-[#1d1c1a] font-mono tracking-wide text-panel-foreground/80'
                  }`}
                >
                  {chip.label}
                </motion.span>
              </span>
            ))}
          </div>

          {/* right holds */}
          <div className="hidden flex-col items-start gap-10 md:flex">
            {HOLDS_RIGHT.map((t) => (
              <Hold key={t} text={t} side="r" on={on === 1} />
            ))}
          </div>
        </div>

        {/* mobile holds */}
        <motion.div
          animate={{ opacity: on === 1 ? 1 : 0 }}
          transition={{ duration: 0.5 }}
          className="mt-8 grid grid-cols-2 gap-x-8 gap-y-2 md:hidden"
        >
          {[...HOLDS_LEFT, ...HOLDS_RIGHT].map((t) => (
            <span key={t} className="microlabel text-center opacity-70">
              {t}
            </span>
          ))}
        </motion.div>

        {/* caption zone — the folder line ⇄ the definition */}
        <div className="relative mt-10 flex min-h-[7.5rem] w-full max-w-2xl items-start justify-center text-center md:mt-14">
          <AnimatePresence mode="wait">
            {on === 0 ? (
              <motion.p
                key="folder"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="text-base leading-relaxed text-panel-foreground/55 md:text-lg"
              >
                A logo file. A palette. A guidelines PDF nobody opens twice.
                <br />
                And a few people who remember how it&rsquo;s supposed to feel.
              </motion.p>
            ) : (
              <motion.div
                key="system"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
              >
                <p className="font-display text-2xl font-extrabold md:text-3xl">
                  BrandingOS is the operating system for your brand.
                </p>
                <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-panel-foreground/55 md:text-base">
                  One connected system that holds what the brand means, what it
                  looks like, what belongs to it, and how it should be created —
                  so every person, template, and tool starts from the same
                  source.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ── The rhythmic ledger ────────────────────────────────────────── */

const LEDGER = [
  ['Code', 'version control.'],
  ['Customers', 'a CRM.'],
  ['Money', 'a ledger.'],
  ['Products', 'roadmaps.'],
];

/* ── Section ────────────────────────────────────────────────────── */

export function WhatIs() {
  return (
    <section id="what" className="bg-panel text-panel-foreground" aria-label="What BrandingOS is">
      <div className="container-tight pt-[12vh]">
        <ChapterHead label="What BrandingOS is" hint="01" />

        <motion.h2 {...reveal} className="display-chapter mt-10 max-w-4xl">
          Your company has a system for everything.
          <br />
          <span className="opacity-50">
            Except the thing everything depends on.
          </span>
        </motion.h2>

        {/* the rhythmic ledger */}
        <div className="mt-16 max-w-3xl md:mt-24">
          {LEDGER.map(([thing, system], i) => (
            <motion.p
              key={thing}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.7, delay: i * 0.06, ease: [0.19, 1, 0.22, 1] }}
              className="border-t border-white/10 py-4 font-display text-xl font-bold md:py-5 md:text-2xl"
            >
              {thing} <span className="font-normal opacity-45">has</span>{' '}
              {system}
            </motion.p>
          ))}
          <motion.p
            {...reveal}
            className="border-y border-white/10 py-5 font-display text-2xl font-extrabold md:py-6 md:text-4xl"
          >
            Brand <span className="font-normal opacity-45">has</span>{' '}
            <span className="serif-accent">a folder.</span>
          </motion.p>
        </div>
      </div>

      {/* the folder becomes the system */}
      <FolderToSystem />

      {/* closing */}
      <div className="container-tight pb-[14vh] pt-[6vh] text-center">
        <motion.p {...reveal} className="display-chapter">
          <span className="opacity-45">Not a folder your brand lives in.</span>
          <br />
          The system your brand <span className="serif-accent">runs on.</span>
        </motion.p>

        <motion.a
          {...reveal}
          href="#why"
          className="btn-ghost mt-12 inline-flex text-panel-foreground/70 hover:text-panel-foreground"
        >
          See how it works
          <span aria-hidden="true">→</span>
        </motion.a>
      </div>
    </section>
  );
}
