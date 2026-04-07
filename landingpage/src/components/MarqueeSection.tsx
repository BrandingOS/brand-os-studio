/**
 * Marquee — Relume-style "as featured in" strip.
 *
 * Sits just under the hero. Single line of value-prop tags scrolling
 * horizontally with edge masks. No background fill, just thin top + bottom
 * hairlines and a soft fade at the edges (handled by .marquee class).
 */
export const MarqueeSection = () => {
  const items = [
    'One source of truth',
    'On-brand, every time',
    'Auto-generated assets',
    'Export anywhere',
    'Share live guidelines',
    'Design faster',
  ];

  return (
    <section className="border-y border-border py-8">
      <div className="marquee">
        <div className="marquee-inner px-6">
          {[...items, ...items].map((item, i) => (
            <span key={i} className="marquee-item flex items-center gap-4">
              {item}
              <span aria-hidden className="text-border">
                ●
              </span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};
