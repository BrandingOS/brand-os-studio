/**
 * Marquee — value-prop strip with edge fades.
 * Sits between hero and pain points as a "promise" line.
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
    <section className="py-8 border-y border-border bg-secondary/40">
      <div className="marquee">
        <div className="marquee-inner px-6">
          {[...items, ...items].map((item, i) => (
            <span key={i} className="marquee-item flex items-center gap-4">
              {item}
              <span aria-hidden className="text-border">
                ◆
              </span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};
