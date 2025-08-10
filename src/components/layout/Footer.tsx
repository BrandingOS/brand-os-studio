import { Button } from "@/components/ui/button";

export default function Footer() {
  return (
    <footer className="mt-20">
      <div className="container-tight">
        {/* Floating dark widget (not full width) */}
        <div className="relative mx-auto max-w-5xl rounded-3xl px-8 py-12 text-center">
          {/* dark panel background */}
          <div className="absolute inset-0 rounded-3xl bg-[#0F1011]" aria-hidden />

          {/* subtle grid: light, dynamic, stronger at edges */}
          <div
            className="
              pointer-events-none absolute inset-0 rounded-3xl
              [background-image:repeating-linear-gradient(0deg,rgba(255,255,255,0.10)_0_1px,transparent_1px_56px),
                                  repeating-linear-gradient(90deg,rgba(255,255,255,0.10)_0_1px,transparent_1px_56px)]
              opacity-45
              [mask-image:radial-gradient(120%_95%_at_50%_50%,transparent_32%,black_72%)]
            "
            aria-hidden
          />

          {/* content */}
          <div className="relative space-y-6 flex flex-col items-center">
            <h3 className="font-display text-2xl font-semibold text-white">
              Your Brand. Everywhere. Always.
            </h3>

            {/* links grid */}
            <div className="mt-6 grid w-full grid-cols-2 gap-6 sm:grid-cols-3 justify-items-center">
              <div>
                <h4 className="mb-3 text-sm font-medium text-white">Product</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><a className="hover:underline" href="#">Overview</a></li>
                  <li><a className="hover:underline" href="#">Guidelines</a></li>
                  <li><a className="hover:underline" href="#">Design Studio</a></li>
                </ul>
              </div>
              <div>
                <h4 className="mb-3 text-sm font-medium text-white">Resources</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><a className="hover:underline" href="#">Blog</a></li>
                  <li><a className="hover:underline" href="#">Help Center</a></li>
                  <li><a className="hover:underline" href="#">API</a></li>
                </ul>
              </div>
              <div>
                <h4 className="mb-3 text-sm font-medium text-white">Company</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><a className="hover:underline" href="#">About</a></li>
                  <li><a className="hover:underline" href="#">Careers</a></li>
                  <li><a className="hover:underline" href="#">Contact</a></li>
                </ul>
              </div>
            </div>

            {/* lightweight pills under links (same structure, lighter style) */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="secondary"
                size="sm"
                shape="pill"
                className="bg-transparent text-white border border-white/25 hover:border-white/40 hover:bg-white/5 px-3 py-1.5 text-xs"
              >
                License
              </Button>
              <Button
                variant="secondary"
                size="sm"
                shape="pill"
                className="bg-transparent text-white border border-white/25 hover:border-white/40 hover:bg-white/5 px-3 py-1.5 text-xs"
              >
                Changelog
              </Button>
              <Button
                variant="secondary"
                size="sm"
                shape="pill"
                className="bg-transparent text-white border border-white/25 hover:border-white/40 hover:bg-white/5 px-3 py-1.5 text-xs"
              >
                Status
              </Button>
            </div>
          </div>
        </div>

        {/* Copyright: last element on the page */}
        <div className="py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Brand OS. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
