import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";

const navItems = [
  { label: "Features", href: "#features" },
  { label: "Solutions", href: "#solutions" },
  { label: "Pricing", href: "#pricing" },
];

export default function Navbar() {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const run = () => {
      if (!sessionStorage.getItem("navIntroDone")) {
        // small delay to feel like after load
        setTimeout(() => {
          setExpanded(true);
          sessionStorage.setItem("navIntroDone", "1");
        }, 350);
      } else {
        setExpanded(true);
      }
    };
    if (document.readyState === "complete") run();
    else window.addEventListener("load", run, { once: true });
  }, []);

  return (
    <header className="sticky top-4 z-40">
      <div className="container-tight">
        <div className={`transition-all duration-500 ${expanded ? "mx-auto max-w-4xl" : "mx-auto w-fit"}`}>
          <div
            className={`nav-glass flex items-center rounded-full px-4 py-2 transition-all duration-500 ${
              expanded ? "justify-between w-full" : "justify-center w-auto"
            }`}
          >
            <div className="flex items-center gap-3" data-animate>
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                <Building2 className="h-5 w-5" />
              </div>
              <a href="#" className="font-display text-lg font-semibold">Brand OS</a>
            </div>

            <nav
              className={`hidden md:flex items-center gap-6 transition-all duration-300 ${
                expanded ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1 pointer-events-none"
              }`}
              aria-label="Primary"
              data-animate
            >
              {navItems.map((n) => (
                <a key={n.label} href={n.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {n.label}
                </a>
              ))}
            </nav>

            <div
              className={`flex items-center gap-2 transition-all duration-300 ${
                expanded ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1 pointer-events-none"
              }`}
              data-animate
            >
              <Button variant="hero" shape="pill" className="cta-glow">Request Waitlist</Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
