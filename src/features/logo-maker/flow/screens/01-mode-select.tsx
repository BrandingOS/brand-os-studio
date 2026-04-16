// Phase 1 will implement the Mode Select screen per spec §3.2.
// Phase 0 placeholder only.

export default function ModeSelectScreen() {
  return (
    <div className="max-w-3xl mx-auto py-24 px-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight mb-3">
        Logo Maker — Mode Select
      </h1>
      <p className="text-muted-foreground mb-8">
        Phase 0 scaffold. The 4-mode selector (AI · Wizard · Canvas · Upload)
        ships in Phase 1.
      </p>
      <p className="text-xs text-muted-foreground/60">
        See <code className="font-mono">docs/logo-maker/LOGO_MAKER_SPEC.md</code>
      </p>
    </div>
  );
}
