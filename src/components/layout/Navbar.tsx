import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";

const navItems = [
  { label: "Features", href: "#features" },
  { label: "Solutions", href: "#solutions" },
  { label: "Pricing", href: "#pricing" },
];

export default function Navbar() {
  return (
    <header className="sticky top-4 z-40">
      <div className="container-tight">
        <div className="mx-auto max-w-4xl">
          {/* nav glass pill */}
          <div
            className="
              nav-glass rounded-full
              px-3 py-1.5
              md:px-4 md:py-2
            "
          >
            {/* Stack on mobile, row on desktop */}
            <div
              className="
                flex flex-col md:flex-row md:items-center gap-2 md:gap-4
              "
            >
              {/* Brand */}
              <div className="flex items-center gap-2 md:gap-3 min-w-0" data-animate>
                <div className="inline-flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-full bg-muted shrink-0">
                  <Building2 className="h-4 w-4 md:h-5 md:w-5" />
                </div>
                <a
                  href="#"
                  className="
                    font-display font-semibold truncate
                    text-base md:text-lg
                  "
                >
                  Brand OS
                </a>
              </div>

              {/* Links (desktop only) */}
              <nav
                className="hidden md:flex items-center gap-6 ml-auto"
                aria-label="Primary"
                data-animate
              >
                {navItems.map((n) => (
                  <a
                    key={n.label}
                    href={n.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {n.label}
                  </a>
                ))}
              </nav>

              {/* CTA (full width on mobile, inline on desktop) */}
              <div className="md:ml-0" data-animate>
                <Button
                  variant="hero"
                  shape="pill"
                  className="
                    cta-glow w-full md:w-auto
                    whitespace-nowrap
                    text-sm md:text-[0.95rem]
                    px-4 md:px-5
                    py-2 md:py-2.5
                  "
                >
                  Request Waitlist
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
