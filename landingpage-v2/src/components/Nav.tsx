/**
 * Fixed top navigation — one warm-charcoal bar (ds dark map), built
 * for a multi-page site: no in-page scroll-spy, no anchor jumping.
 *
 * brand.ai-style mega-menu: hovering "Product" expands the SAME bar
 * downward into a panel of cards — bar and panel are one continuous
 * rounded shape. Menu card hrefs are placeholders until the real
 * pages exist (wire routes here when they do).
 *
 * Mobile: the 3×3 dot button (the Align formation) opens a
 * full-screen charcoal overlay that circle-expands from the button.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from 'framer-motion';
import { LogoMark } from '@/components/brand/LogoMark';
import { PluckLogo } from '@/components/brand/PluckLogo';
import { useEarlyAccess } from '@/components/EarlyAccessProvider';

/* ── Menu data — grows one line per future page ─────────────────── */

type MenuCard = {
  title: string;
  desc: string;
  /* TODO: point at real routes once the pages exist */
  href: string;
  big?: boolean;
};

const PRODUCT_MENU: MenuCard[] = [
  {
    title: 'Product overview',
    desc: 'One core that becomes every deliverable you ship.',
    href: '#',
    big: true,
  },
  {
    title: 'Brand Kit',
    desc: 'Generate, review, approve — then it’s yours.',
    href: '#',
  },
  {
    title: 'Design Studio',
    desc: 'Plan and create in one on-brand canvas.',
    href: '#',
  },
];

const SOLUTIONS_MENU: MenuCard[] = [
  {
    title: 'For founders',
    desc: 'Launch with a complete brand from day one.',
    href: '#',
  },
  {
    title: 'For designers',
    desc: 'Turn client brands into living systems.',
    href: '#',
  },
  {
    title: 'For agencies',
    desc: 'Run every brand you manage on one core.',
    href: '#',
  },
];

type NavEntry =
  | { id: string; label: string; menu: MenuCard[] }
  | { id: string; label: string; href: string };

/* All hrefs are placeholders until the real pages exist. */
const NAV_ENTRIES: NavEntry[] = [
  { id: 'product', label: 'Product', menu: PRODUCT_MENU },
  { id: 'solutions', label: 'Solutions', menu: SOLUTIONS_MENU },
  { id: 'pricing', label: 'Pricing', href: '#' },
  { id: 'company', label: 'Company', href: '#' },
  { id: 'blog', label: 'Blog', href: '#' },
];

/** 3×3 dot grid — the Align formation as a menu glyph. */
function DotGridIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      {Array.from({ length: 9 }, (_, i) => (
        <circle
          key={i}
          cx={4 + (i % 3) * 6}
          cy={4 + Math.floor(i / 3) * 6}
          r={i === 4 ? 2 : 1.5}
        />
      ))}
    </svg>
  );
}

/* ── Mobile full-screen menu ────────────────────────────────────── */

function MobileMenu({
  open,
  origin,
  onClose,
  onCta,
}: {
  open: boolean;
  /** Viewport centre of the button that opened the menu — the reveal
   *  circle expands from exactly there. */
  origin: { x: number; y: number } | null;
  onClose: () => void;
  onCta: () => void;
}) {
  const reduced = useReducedMotion();

  // Scroll lock + Escape
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const at = origin ? `${origin.x}px ${origin.y}px` : '50% 36px';
  const clipOpen = `circle(150% at ${at})`;
  const clipShut = `circle(0% at ${at})`;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={reduced ? { opacity: 0 } : { clipPath: clipShut }}
          animate={reduced ? { opacity: 1 } : { clipPath: clipOpen }}
          exit={reduced ? { opacity: 0 } : { clipPath: clipShut }}
          transition={{ duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
          className="fixed inset-0 z-[55] flex flex-col bg-panel text-panel-foreground"
        >
          <div className="container-wide flex w-full shrink-0 items-center justify-between pt-4 md:pt-5">
            <span className="flex h-10 items-center">
              <LogoMark className="h-[24px] w-[24px]" />
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25"
            >
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M2 2l12 12M14 2L2 14" />
              </svg>
            </button>
          </div>

          {/* Top-level pages — no in-page anchors */}
          <nav className="container-wide flex w-full flex-1 flex-col justify-center gap-1" aria-label="Primary">
            {NAV_ENTRIES.map((entry, i) => (
              <motion.a
                key={entry.id}
                href={'href' in entry ? entry.href : '#'}
                onClick={onClose}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22 + i * 0.06, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="group flex items-baseline gap-4 py-2.5"
              >
                <span className="microlabel w-7 opacity-45">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="font-display text-[2.2rem] font-bold leading-none transition-opacity duration-300 group-hover:opacity-70">
                  {entry.label}
                </span>
              </motion.a>
            ))}
          </nav>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="container-wide flex w-full shrink-0 flex-col gap-6 pb-10"
          >
            <button type="button" onClick={onCta} className="btn-on-dark w-full">
              Get early access
            </button>
            <span className="microlabel text-center opacity-45">
              One core. Infinite formations.
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── The bar ────────────────────────────────────────────────────── */

export function Nav() {
  const { open } = useEarlyAccess();
  const { scrollY } = useScroll();

  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuOrigin, setMenuOrigin] = useState<{ x: number; y: number } | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    if (y >= 60) {
      const delta = y - prev;
      if (delta > 4) {
        setHidden(true);
        setOpenMenu(null);
      } else if (delta < -4) {
        setHidden(false);
      }
    } else {
      setHidden(false);
    }
  });

  // Escape closes the mega-menu
  useEffect(() => {
    if (!openMenu) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenMenu(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openMenu]);

  const openCta = () => {
    setMenuOpen(false);
    open();
  };

  const activeEntry = NAV_ENTRIES.find(
    (e) => 'menu' in e && e.id === openMenu,
  ) as Extract<NavEntry, { menu: MenuCard[] }> | undefined;

  // The panel morphs between entries: it never closes while the mouse
  // stays inside the bar — content crossfades and the measured height
  // animates to the new content's size.
  const panelInnerRef = useRef<HTMLDivElement>(null);
  const [panelH, setPanelH] = useState(0);
  useLayoutEffect(() => {
    if (openMenu && panelInnerRef.current) {
      setPanelH(panelInnerRef.current.offsetHeight);
    }
  }, [openMenu]);

  return (
    <>
      <motion.header
        initial={{ y: -28, opacity: 0 }}
        animate={{ y: hidden && !menuOpen ? '-130%' : 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none fixed inset-x-0 top-0 z-50"
      >
        <div className="px-4 pt-4 md:px-6 md:pt-5">
          {/* Hover region: the bar + the floating panel below it. The
              gap between them lives inside this wrapper, so gliding
              from bar to panel never closes the menu. */}
          <div
            onMouseLeave={() => setOpenMenu(null)}
            className="pointer-events-auto mx-auto w-full max-w-[940px] text-panel-foreground"
          >
            {/* The bar — its own rounded shape */}
            <div className="flex h-14 items-center justify-between rounded-[16px] border border-white/10 bg-panel pl-5 pr-2 shadow-[0_16px_48px_-20px_rgba(0,0,0,0.45)] md:h-16 md:rounded-[20px] md:pl-6 md:pr-2.5">
              {/* Left — lockup + entries */}
              <div className="flex min-w-0 items-center gap-8 lg:gap-10">
                {/* Icon-only mark — static at rest; clicking plays the
                    Pluck Wave and glides back home */}
                <PluckLogo
                  className="flex h-[26px] w-[26px] shrink-0 items-center"
                  onActivate={() => {
                    const lenis = (window as unknown as {
                      __lenis?: { scrollTo: (t: number, o?: object) => void };
                    }).__lenis;
                    if (lenis) lenis.scrollTo(0, { duration: 1.4 });
                    else window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />

                <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
                  {NAV_ENTRIES.map((entry) =>
                    'menu' in entry ? (
                      <button
                        key={entry.id}
                        type="button"
                        aria-haspopup="true"
                        aria-expanded={openMenu === entry.id}
                        onMouseEnter={() => setOpenMenu(entry.id)}
                        onClick={() =>
                          setOpenMenu((m) => (m === entry.id ? null : entry.id))
                        }
                        className={`px-3 py-2 text-[15px] font-medium transition-colors duration-300 ${
                          openMenu === entry.id
                            ? 'text-panel-foreground'
                            : 'text-panel-foreground/60 hover:text-panel-foreground'
                        }`}
                      >
                        {entry.label}
                      </button>
                    ) : (
                      <a
                        key={entry.id}
                        href={entry.href}
                        onMouseEnter={() => setOpenMenu(null)}
                        className="px-3 py-2 text-[15px] font-medium text-panel-foreground/60 transition-colors duration-300 hover:text-panel-foreground"
                      >
                        {entry.label}
                      </a>
                    ),
                  )}
                </nav>
              </div>

              {/* Right — log in + CTA */}
              <div className="flex items-center gap-2 md:gap-6">
                {/* TODO: point at the app's real login URL once decided */}
                <a
                  href="#"
                  className="hidden text-[15px] font-medium text-panel-foreground/60 transition-colors duration-300 hover:text-panel-foreground md:block"
                >
                  Log in
                </a>
                {/* Reference-style CTA: rounded rect, filled white;
                    hover = outline only (border stays, fill drops) */}
                <button
                  type="button"
                  onClick={open}
                  className="hidden h-10 items-center rounded-[12px] border border-panel-foreground bg-panel-foreground px-5 text-[15px] font-semibold text-panel transition-colors duration-150 ease-out-expo hover:bg-transparent hover:text-panel-foreground md:inline-flex md:h-11"
                >
                  Get early access
                </button>

                {/* Mobile menu — the Align formation */}
                <button
                  type="button"
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    setMenuOrigin({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
                    setMenuOpen(true);
                  }}
                  aria-label="Open menu"
                  aria-expanded={menuOpen}
                  className="flex h-10 w-10 items-center justify-center rounded-[10px] text-panel-foreground md:hidden"
                >
                  <DotGridIcon />
                </button>
              </div>
            </div>

            {/* Floating mega-panel — ONE persistent charcoal box that
                never remounts: its height springs between entries and
                only the transparent content grids crossfade inside.
                No panel-over-panel overlap → no flicker. The 10px gap
                is a static margin; opacity hides the hairline when
                collapsed and the shadow is never clipped. */}
            <motion.div
              initial={false}
              animate={{
                height: activeEntry ? panelH + 2 : 0,
                opacity: activeEntry ? 1 : 0,
              }}
              transition={{
                height: { type: 'spring', stiffness: 190, damping: 26, mass: 0.9 },
                opacity: { duration: 0.18 },
              }}
              className="mt-2.5 hidden overflow-hidden rounded-[16px] border border-white/10 bg-panel shadow-[0_16px_48px_-20px_rgba(0,0,0,0.45)] md:block md:rounded-[20px]"
            >
              <div ref={panelInnerRef} className="relative p-2.5">
                <AnimatePresence initial={false} mode="popLayout">
                  {activeEntry && (
                    <motion.div
                      key={activeEntry.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                  {activeEntry.menu.some((c) => c.big) ? (
                    /* Layout A — one big card + stacked side cards */
                    <div className="grid grid-cols-[1.25fr_1fr] gap-2.5">
                      {activeEntry.menu
                        .filter((c) => c.big)
                        .map((c) => (
                          <a
                            key={c.title}
                            href={c.href}
                            className="group flex flex-col rounded-[14px] bg-[#1d1c1a] p-6 transition-colors duration-150 hover:bg-[#252420]"
                          >
                            <span className="font-display text-xl font-bold">
                              {c.title}
                            </span>
                            <span className="mt-1.5 text-[15px] text-panel-foreground/50">
                              {c.desc}
                            </span>
                            <span className="mt-5 flex h-44 items-center justify-center rounded-[10px] bg-[#191816]">
                              <LogoMark
                                breathe
                                className="h-24 w-24 text-panel-foreground/80 transition-transform duration-300 group-hover:scale-105"
                              />
                            </span>
                          </a>
                        ))}
                      <div className="flex flex-col gap-2.5">
                        {activeEntry.menu
                          .filter((c) => !c.big)
                          .map((c) => (
                            <a
                              key={c.title}
                              href={c.href}
                              className="flex flex-1 flex-col justify-start rounded-[14px] bg-[#1d1c1a] p-6 transition-colors duration-150 hover:bg-[#252420]"
                            >
                              <span className="font-display text-xl font-bold">
                                {c.title}
                              </span>
                              <span className="mt-1.5 text-[15px] text-panel-foreground/50">
                                {c.desc}
                              </span>
                            </a>
                          ))}
                      </div>
                    </div>
                  ) : (
                    /* Layout B — equal columns */
                    <div className="grid grid-cols-3 gap-2.5">
                      {activeEntry.menu.map((c) => (
                        <a
                          key={c.title}
                          href={c.href}
                          className="flex min-h-[150px] flex-col rounded-[14px] bg-[#1d1c1a] p-6 transition-colors duration-150 hover:bg-[#252420]"
                        >
                          <span className="font-display text-xl font-bold">
                            {c.title}
                          </span>
                          <span className="mt-1.5 text-[15px] text-panel-foreground/50">
                            {c.desc}
                          </span>
                        </a>
                      ))}
                    </div>
                  )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.header>

      <MobileMenu
        open={menuOpen}
        origin={menuOrigin}
        onClose={() => setMenuOpen(false)}
        onCta={openCta}
      />
    </>
  );
}
