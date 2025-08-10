import { marqueeItems } from "@/data/landing";

export const MarqueeSection = () => {
  // Duplicate items for seamless loop
  const allItems = [...marqueeItems, ...marqueeItems];

  return (
    <section className="py-6">
      <div className="container-tight">
        <div className="marquee rounded-full bg-secondary/60 border border-border/60">
          <div className="marquee-inner px-6 py-3">
            {allItems.map((item, index) => (
              <span key={`${item.id}-${index}`} className="marquee-item">
                {item.text} •
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};