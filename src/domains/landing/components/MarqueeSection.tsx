export const MarqueeSection = () => {
  return (
    <section className="py-6">
      <div className="container-tight">
        <div className="marquee rounded-full bg-secondary/60 border border-border/60">
          <div className="marquee-inner px-6 py-3">
            <span className="marquee-item">One source of truth •</span>
            <span className="marquee-item">On‑brand, every time •</span>
            <span className="marquee-item">Auto‑generated assets •</span>
            <span className="marquee-item">Export anywhere •</span>
            <span className="marquee-item">Share live guidelines •</span>
            <span className="marquee-item">Design faster •</span>
            {/* duplicate for seamless loops */}
            <span className="marquee-item">One source of truth •</span>
            <span className="marquee-item">On‑brand, every time •</span>
            <span className="marquee-item">Auto‑generated assets •</span>
            <span className="marquee-item">Export anywhere •</span>
            <span className="marquee-item">Share live guidelines •</span>
            <span className="marquee-item">Design faster •</span>
          </div>
        </div>
      </div>
    </section>
  );
};