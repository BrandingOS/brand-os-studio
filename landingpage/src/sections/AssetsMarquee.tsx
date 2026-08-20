/**
 * Asset marquee (ink) — Frontify-style twin strips, re-skinned to the
 * BrandingOS system: file-type tiles drifting one way, kit cards
 * drifting the other. Pure CSS loop (.marquee-track in index.css);
 * each half of a track is identical so translateX(-50%) tiles
 * seamlessly. Decorative — hidden from the accessibility tree.
 */

const FILES = ['SVG', 'JPEG', 'PNG', 'GIF', 'MP4', 'PDF', 'AI', 'DOCX'];

const KITS = [
  'Case study library',
  'Onboarding hub',
  'Brand Guideline',
  'Campaign Toolkit',
  'Design System',
  'Social media kit',
];

function Track({
  children,
  reverse,
  duration,
}: {
  children: React.ReactNode;
  reverse?: boolean;
  duration: number;
}) {
  return (
    <div className="overflow-hidden">
      <div
        className="marquee-track flex w-max"
        style={{
          animationDuration: `${duration}s`,
          animationDirection: reverse ? 'reverse' : undefined,
        }}
      >
        {[0, 1].map((dup) => (
          <div key={dup} className="flex shrink-0 gap-4 pr-4 md:gap-5 md:pr-5">
            {children}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AssetsMarquee() {
  return (
    <section
      aria-label="File formats in, brand kits out"
      className="overflow-hidden bg-panel py-[8vh] text-panel-foreground"
    >
      <div aria-hidden="true" className="space-y-5 md:space-y-6">
        {/* raw formats drift one way… Each half is repeated wide enough
            to always overflow the viewport — no gap, no visible restart. */}
        <Track duration={34}>
          {[...FILES, ...FILES, ...FILES].map((f, i) => (
            <span
              key={`${f}${i}`}
              className="grid h-[150px] w-[112px] shrink-0 place-items-center rounded-[14px] border border-white/10 bg-white/[0.05] font-mono text-sm tracking-wide text-panel-foreground/70 md:h-[170px] md:w-[128px]"
            >
              {f}
            </span>
          ))}
        </Track>

        {/* …the kits they become drift the other */}
        <Track duration={44} reverse>
          {[...KITS, ...KITS].map((k, i) => (
            <span
              key={`${k}${i}`}
              className="flex h-[130px] w-[230px] shrink-0 flex-col justify-between rounded-[14px] border border-white/10 bg-white/[0.05] p-5 md:h-[150px] md:w-[260px]"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10">
                <svg
                  viewBox="0 0 12 12"
                  className="h-3 w-3 text-panel-foreground/80"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                >
                  <path d="M6 1v10M1 6h10" />
                </svg>
              </span>
              <span className="text-[15px] font-medium text-panel-foreground/85">
                {k}
              </span>
            </span>
          ))}
        </Track>
      </div>
    </section>
  );
}
