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
    <section className="py-3 border-y border-border/60 bg-secondary/30">
      <div className="marquee">
        <div className="marquee-inner px-4">
          {[...items, ...items].map((item, i) => (
            <span key={i} className="marquee-item text-xs text-muted-foreground flex items-center gap-3">
              {item}
              <span aria-hidden className="text-border/60 text-[8px]">
                ◆
              </span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};
