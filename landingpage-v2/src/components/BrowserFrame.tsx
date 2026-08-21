/**
 * BrowserFrame — a ds-styled browser chrome around a real product
 * screenshot. The screenshots are the copy now: they show what
 * BrandingOS is instead of describing it.
 */
export function BrowserFrame({
  src,
  alt,
  url,
  dark = false,
  className,
}: {
  src: string;
  alt: string;
  url?: string;
  /** dark chrome for the ink chapters */
  dark?: boolean;
  className?: string;
}) {
  return (
    <figure
      className={`overflow-hidden rounded-[14px] border ${
        dark
          ? 'border-white/10 bg-[#1d1c1a] shadow-[0_24px_80px_-24px_rgba(0,0,0,0.6)]'
          : 'border-border bg-card shadow-glow'
      } ${className ?? ''}`}
    >
      <div
        className={`flex items-center gap-2 border-b px-4 py-2.5 ${
          dark ? 'border-white/10' : 'border-border'
        }`}
      >
        <span className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full ${
                dark ? 'bg-white/20' : 'bg-foreground/15'
              }`}
            />
          ))}
        </span>
        {url && (
          <span
            className={`ml-2 rounded-full px-3 py-0.5 font-mono text-[10px] tracking-wide ${
              dark
                ? 'bg-white/[0.06] text-white/45'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {url}
          </span>
        )}
      </div>
      <img src={src} alt={alt} loading="lazy" className="block w-full" />
    </figure>
  );
}
