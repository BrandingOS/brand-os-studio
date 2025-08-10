import React, { useEffect, useMemo, useRef, useState } from "react";

interface Step { id: string; label: string }

export default function StepsProgress({ steps }: { steps: Step[] }) {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0); // 0..1 fill of the line
  const sectionRef = useRef<HTMLElement | null>(null);

  // attach after mount to the #how section
  useEffect(() => {
    sectionRef.current = document.getElementById("how") as HTMLElement | null;
    const els = steps.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];

    const io = new IntersectionObserver(
      (entries) => {
        // find the most visible
        const byVis = [...entries].sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = byVis[0];
        if (top) {
          const idx = els.findIndex((e) => e === top.target);
          if (idx !== -1) setActive(idx);
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    els.forEach((el) => io.observe(el));

    const onScroll = () => {
      const sec = sectionRef.current;
      if (!sec) return;
      const rect = sec.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = rect.height + vh * 0.2; // small buffer
      const seen = Math.min(Math.max(vh - Math.max(0, rect.top), 0), total);
      const p = Math.max(0, Math.min(1, seen / total));
      setProgress(p);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [steps]);

  const fillHeight = useMemo(() => `${progress * 100}%`, [progress]);

  return (
    <aside className="absolute left-0 top-0 hidden md:block" aria-hidden>
      <div className="sticky top-32 h-[520px] w-8">
        <div className="relative h-full mx-auto">
          {/* line */}
          <div className="absolute left-1/2 -translate-x-1/2 w-px h-full bg-border/60 overflow-hidden rounded">
            <div
              className="absolute left-0 top-0 w-full bg-[hsl(var(--accent-orange))]"
              style={{ height: fillHeight, boxShadow: "0 0 12px hsl(var(--accent-orange) / 0.6)" }}
            />
          </div>
          {/* dots */}
          <div className="absolute inset-0 flex flex-col justify-between py-2">
            {steps.map((s, i) => (
              <div key={s.id} className="relative flex items-center">
                <span
                  className={`block h-3 w-3 rounded-full border transition-all duration-300 ${
                    i === active
                      ? "border-[hsl(var(--accent-orange))] bg-[hsl(var(--accent-orange))] shadow-[0_0_0_4px_hsl(var(--accent-orange)/0.15)]"
                      : "border-border bg-background"
                  }`}
                />
                <span className={`ml-3 text-xs ${i === active ? "text-foreground" : "text-muted-foreground"}`}>{steps[i].label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
