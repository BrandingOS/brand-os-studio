const items = [
  'One source of truth',
  'On-brand every time',
  'Auto-generated assets',
  'Export anywhere',
  'Share live guidelines',
  'Design faster',
  'AI-powered strategy',
  'Multi-format export',
  '19 brand modules',
  'Canvas editor',
];

export function V2Marquee() {
  return (
    <section className="relative py-10 overflow-hidden">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[hsl(0,0%,4%)] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[hsl(0,0%,4%)] to-transparent z-10 pointer-events-none" />

      {/* Track */}
      <div className="flex gap-8 whitespace-nowrap animate-marquee-left">
        {/* Double for seamless loop */}
        {[...items, ...items].map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-3 text-xs font-medium tracking-[0.08em] uppercase text-white/15"
          >
            <span className="w-1 h-1 rounded-full bg-white/10 flex-shrink-0" />
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
