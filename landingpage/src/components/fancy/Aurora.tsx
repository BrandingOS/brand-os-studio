/**
 * Aurora — animated mesh-gradient background.
 *
 * Three large blurred gradient orbs (violet, pink, cyan) gently floating.
 * Layered above a subtle dot grid mask. Drop into any section as the
 * first child of an `aurora-stage` parent — it positions absolutely.
 */
interface AuroraProps {
  className?: string;
  /** Hide individual blobs if you only want a subset. */
  hide?: ('violet' | 'pink' | 'cyan' | 'orange')[];
}

export function Aurora({ className = '', hide = [] }: AuroraProps) {
  return (
    <div
      aria-hidden
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
    >
      {/* Subtle grid mask */}
      <div className="absolute inset-0 bg-grid opacity-50" />

      {/* Aurora orbs */}
      {!hide.includes('violet') && (
        <div
          className="aurora-blob aurora-blob-violet animate-float-slow"
          style={{ width: 560, height: 560, top: '-12%', left: '-8%' }}
        />
      )}
      {!hide.includes('pink') && (
        <div
          className="aurora-blob aurora-blob-pink animate-float-slower"
          style={{ width: 520, height: 520, top: '12%', right: '-10%' }}
        />
      )}
      {!hide.includes('cyan') && (
        <div
          className="aurora-blob aurora-blob-cyan animate-float-slow"
          style={{
            width: 480,
            height: 480,
            bottom: '-18%',
            left: '32%',
            animationDelay: '4s',
          }}
        />
      )}
      {!hide.includes('orange') && (
        <div
          className="aurora-blob aurora-blob-orange animate-float-slower"
          style={{
            width: 380,
            height: 380,
            top: '40%',
            left: '60%',
            opacity: 0.35,
            animationDelay: '2s',
          }}
        />
      )}

      {/* Vignette to taper edges into the dark canvas */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[hsl(var(--bg))]" />
    </div>
  );
}
