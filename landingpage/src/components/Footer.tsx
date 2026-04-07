import { Button } from '@/components/ui/button';

export default function Footer() {
  return (
    <footer className="mt-20">
      <div className="container-tight">
        {/* Floating dark widget */}
        <div className="relative mx-auto max-w-5xl rounded-3xl px-8 py-12 text-center shadow-elegant">
          {/* dark panel background */}
          <div
            className="absolute inset-0 rounded-3xl panel-dark feature-stroke overflow-hidden"
            aria-hidden
          />

          {/* subtle grid + vignette */}
          <div
            className="pointer-events-none absolute inset-0 rounded-3xl bg-grid opacity-35 [mask-image:radial-gradient(120%_95%_at_50%_50%,transparent_28%,black_78%)]"
            aria-hidden
          />

          {/* soft corner highlight */}
          <div
            className="pointer-events-none absolute inset-0 rounded-3xl [background:radial-gradient(140%_100%_at_0%_0%,hsl(0_0%_100%/.08)_0%,transparent_50%)]"
            aria-hidden
          />

          {/* glass hairline */}
          <div
            className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/5"
            aria-hidden
          />

          {/* content */}
          <div className="relative flex flex-col items-center space-y-6">
            <h3 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-white">
              Your Brand. Everywhere. Always.
            </h3>

            <nav
              className="mt-6 grid w-full grid-cols-1 sm:grid-cols-3 gap-8 justify-items-center"
              aria-label="Footer"
            >
              <div>
                <h4 className="mb-3 text-sm font-medium text-white">Product</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><span className="text-white/50 cursor-default">Overview</span></li>
                  <li><span className="text-white/50 cursor-default">Guidelines</span></li>
                  <li><span className="text-white/50 cursor-default">Design Studio</span></li>
                </ul>
              </div>

              <div>
                <h4 className="mb-3 text-sm font-medium text-white">Resources</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><span className="text-white/50 cursor-default">Blog</span></li>
                  <li><span className="text-white/50 cursor-default">Help Center</span></li>
                  <li><span className="text-white/50 cursor-default">API</span></li>
                </ul>
              </div>

              <div>
                <h4 className="mb-3 text-sm font-medium text-white">Company</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><span className="text-white/50 cursor-default">About</span></li>
                  <li><span className="text-white/50 cursor-default">Careers</span></li>
                  <li><span className="text-white/50 cursor-default">Contact</span></li>
                </ul>
              </div>
            </nav>

            <div className="flex items-center justify-center gap-2 mt-2">
              <Button
                variant="secondary"
                size="sm"
                className="input-pill bg-transparent text-white/90 border border-white/20 hover:bg-white/5 hover:border-white/35 focus-visible:ring-2 focus-visible:ring-white/20 transition-all duration-300"
              >
                License
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="input-pill bg-transparent text-white/90 border border-white/20 hover:bg-white/5 hover:border-white/35 focus-visible:ring-2 focus-visible:ring-white/20 transition-all duration-300"
              >
                Changelog
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="input-pill bg-transparent text-white/90 border border-white/20 hover:bg-white/5 hover:border-white/35 focus-visible:ring-2 focus-visible:ring-white/20 transition-all duration-300"
              >
                Status
              </Button>
            </div>
          </div>
        </div>

        <div className="py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Brand OS. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
