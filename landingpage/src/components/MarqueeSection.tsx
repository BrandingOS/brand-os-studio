/**
 * Marquee — value-prop strip with edge fades.
 * Sits between hero and pain-points as a "promise" line.
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
    <section className="border-y border-border py-8 bg-bg-elevated/30">
      <div className="marquee">
        <div className="marquee-inner px-6">
          {[...items, ...items].map((item, i) => (
            <span key={i} className="marquee-item flex items-center gap-4">
              {item}
              <span aria-hidden className="text-violet/60">
                ◆
              </span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};
