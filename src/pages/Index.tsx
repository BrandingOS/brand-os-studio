import { useEffect } from "react";
import heroImage from "@/assets/hero-dashboard.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Palette, Upload, Wand2, Globe, Layout, Download, Printer, FileStack, Play, Rocket, Building2, Share2, Twitter, Github, Linkedin } from "lucide-react";

const navItems = [
  { label: "Features", href: "#features" },
  { label: "Solutions", href: "#solutions" },
  { label: "Showcase", href: "#showcase" },
  { label: "Pricing", href: "#pricing" },
  { label: "Docs", href: "#docs" },
];

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('[data-animate]');
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('animate-fade-in');
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

const Badge = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">{children}</span>
);

const FeatureCard = ({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) => (
  <div data-animate className="group card-soft rounded-2xl p-6 transition-transform hover:-translate-y-1.5">
    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted">
      <Icon className="h-5 w-5 group-hover:animate-micro-bounce" />
    </div>
    <h3 className="mb-2 text-lg font-semibold">{title}</h3>
    <p className="text-sm text-muted-foreground">{desc}</p>
  </div>
);

const Stat = ({ value, label }: { value: string; label: string }) => (
  <div data-animate className="text-center">
    <div className="text-3xl font-semibold">{value}</div>
    <div className="text-sm text-muted-foreground">{label}</div>
  </div>
);

const Index = () => {
  useScrollReveal();

  return (
    <div className="min-h-screen bg-background bg-dot-grid text-foreground animate-bg-pan">
      <header className="sticky top-4 z-40">
        <div className="container-tight">
          <div className="nav-glass flex items-center justify-between rounded-full">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                <Building2 className="h-5 w-5" />
              </div>
              <a href="#" className="font-display text-lg font-semibold">Brand OS</a>
            </div>
            <div className="hidden md:flex items-center gap-6">
              {navItems.map((n) => (
                <a key={n.label} href={n.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{n.label}</a>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="hero" shape="pill" className="cta-glow">Request Waitlist</Button>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="section bg-dot-grid">
          <div className="container-tight">
            <div className="mx-auto text-center max-w-3xl" data-animate>
              <Badge>One-time setup → Endless consistency</Badge>
              <h1 className="mt-4 font-display text-4xl sm:text-5xl md:text-6xl leading-tight font-extrabold">
                One Setup. Infinite Branded Possibilities.
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Set it once. Your brand auto-applies to every asset.
              </p>
              <div className="mt-8 mx-auto max-w-xl">
                <form className="flex gap-2">
                  <Input className="flex-1 input-pill h-12 px-5" placeholder="Enter your brand name" aria-label="Brand name" />
                  <Button variant="hero" shape="pill" className="h-12 px-6">Start</Button>
                </form>
                <p className="mt-2 text-xs text-muted-foreground">No credit card required.</p>
              </div>
            </div>

            <div className="relative mt-12" data-animate>
              {/* Animated ripple background */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-64 w-64 rounded-full border border-border/60 animate-ripple-slow"></div>
                <div className="absolute h-80 w-80 rounded-full border border-border/40 animate-ripple-slow [animation-delay:1s]"></div>
              </div>

              <img src={heroImage} alt="Brand OS dashboard mockup" loading="eager" className="w-full rounded-3xl shadow-elegant relative" />
              {/* floating tiles */}
              <div className="pointer-events-none absolute -right-2 -top-6 hidden md:block animate-float">
                <div className="glass-surface rounded-xl px-4 py-3 shadow-elegant flex items-center gap-2">
                  <Layout className="h-4 w-4" /><span className="text-xs">Guidelines</span>
                </div>
              </div>
              <div className="pointer-events-none absolute left-4 -bottom-6 hidden md:block animate-float [animation-delay:600ms]">
                <div className="glass-surface rounded-xl px-4 py-3 shadow-elegant flex items-center gap-2">
                  <Printer className="h-4 w-4" /><span className="text-xs">Business Card</span>
                </div>
              </div>
              <div className="pointer-events-none absolute right-10 bottom-0 hidden md:block animate-float [animation-delay:1200ms]">
                <div className="glass-surface rounded-xl px-4 py-3 shadow-elegant flex items-center gap-2">
                  <Globe className="h-4 w-4" /><span className="text-xs">Website</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pain → Control */}
        <section id="pain" className="section">
          <div className="container-tight">
            <h2 data-animate className="text-3xl font-semibold text-center">Before Brand OS — Chaos. After — Control.</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard icon={FileStack} title="Assets Everywhere" desc="Logos in email, fonts on a drive, colors in your head." />
              <FeatureCard icon={Layout} title="Inconsistent Look" desc="Each designer interprets your brand differently." />
              <FeatureCard icon={Download} title="Rework on Repeat" desc="New color? Change it in 20 files manually." />
            </div>
          </div>
        </section>

        {/* Magic Moment */}
        <section id="how" className="section bg-muted/50">
          <div className="container-tight">
            <h2 data-animate className="text-3xl font-semibold text-center mb-10">Set It Up Once. Brand Everything.</h2>
            <div className="grid gap-6 md:grid-cols-3">
              <FeatureCard icon={Upload} title="Upload Core Assets" desc="Logo, colors, fonts, tone of voice." />
              <FeatureCard icon={Wand2} title="Auto-Generate Everything" desc="Guidelines, print files, templates, website." />
              <FeatureCard icon={Share2} title="Use Anywhere" desc="Download, export, or publish instantly." />
            </div>
          </div>
        </section>

        {/* Differentiator Dark Panel */}
        <section className="section">
          <div className="container-tight">
            <div className="panel-dark relative overflow-hidden rounded-tl-3xl rounded-tr-none rounded-b-3xl p-10 md:p-14">
              <Badge>Why Brand OS</Badge>
              <h2 className="mt-4 text-3xl md:text-4xl font-semibold">More than guidelines — your brand OS.</h2>
              <p className="mt-3 text-base text-muted-foreground max-w-2xl">Live brand logic that auto-applies to every output — from slides and posts to print and your website. One source of truth, used everywhere.</p>
              <div className="mt-6">
                <Button variant="glass" shape="pill" className="bg-background text-foreground">Explore Modules</Button>
              </div>
            </div>
          </div>
        </section>

        {/* Core Modules */}
        <section id="features" className="section">
          <div className="container-tight">
            <h2 data-animate className="text-3xl font-semibold text-center">All-in-One Branding Powerhouse</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-6">
              <div className="md:col-span-3"><FeatureCard icon={Layout} title="Live Brand Guidelines" desc="Instantly updated, shareable, beautiful." /></div>
              <div className="md:col-span-3"><FeatureCard icon={Palette} title="Design Studio" desc="Create on-brand designs without leaving the OS." /></div>
              <div className="md:col-span-2"><FeatureCard icon={Printer} title="Print & Collateral" desc="Auto-generate business cards, letterheads, packaging." /></div>
              <div className="md:col-span-2"><FeatureCard icon={Download} title="Brand Export" desc="One-click full brand folder, perfectly organized." /></div>
              <div className="md:col-span-2"><FeatureCard icon={Globe} title="Website Builder" desc="Launch a branded site in hours, not weeks." /></div>
              <div className="md:col-span-6"><FeatureCard icon={Wand2} title="Smart AI Assist" desc="Suggestions for colors, layouts, and copy." /></div>
            </div>
          </div>
        </section>

        {/* Proof / Stats */}
        <section className="section bg-secondary bg-dot-grid">
          <div className="container-tight grid gap-8 sm:grid-cols-3">
            <Stat value="5,000+" label="Brands launched" />
            <Stat value="3.1M+" label="Assets generated" />
            <Stat value="99.9%" label="Consistency score" />
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="section bg-dot-grid">
          <div className="container-tight">
            <h2 data-animate className="text-3xl font-semibold text-center">Simple, Transparent Pricing</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {/* Free */}
              <div data-animate className="rounded-2xl border p-6 card-soft">
                <h3 className="text-xl font-semibold">Free</h3>
                <p className="mt-2 text-sm text-muted-foreground">Start your brand in minutes.</p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4"/> Core assets</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4"/> Basic guidelines</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4"/> Limited exports</li>
                </ul>
                <Button variant="hero" shape="pill" className="mt-6 w-full">Start Free</Button>
              </div>
              {/* Pro */}
              <div data-animate className="rounded-2xl border p-6 glass-surface shadow-elegant">
                <h3 className="text-xl font-semibold">Pro</h3>
                <p className="mt-2 text-sm text-muted-foreground">Everything to scale your brand.</p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4"/> All modules unlocked</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4"/> Unlimited exports</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4"/> Website publish</li>
                </ul>
                <Button variant="hero" shape="pill" className="mt-6 w-full">Upgrade</Button>
              </div>
              {/* Enterprise */}
              <div data-animate className="rounded-2xl border p-6 card-soft">
                <h3 className="text-xl font-semibold">Enterprise</h3>
                <p className="mt-2 text-sm text-muted-foreground">For large teams and agencies.</p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4"/> SSO & permissions</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4"/> Custom workflows</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4"/> Priority support</li>
                </ul>
                <Button variant="outline" shape="pill" className="mt-6 w-full">Contact sales</Button>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="section bg-dot-grid">
          <div className="container-tight text-center">
            <h2 data-animate className="text-3xl font-semibold">Brand Once. Use Forever.</h2>
            <p className="mt-3 text-lg text-muted-foreground" data-animate>
              Upload your brand today — never worry about consistency again.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3" data-animate>
              <Button variant="hero" shape="pill" className="px-6 py-3"><Rocket className="mr-2"/> Start Free</Button>
              <Button variant="outline" shape="pill" className="px-6 py-3"><Play className="mr-2"/> Watch Demo</Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border panel-dark">
        <div className="container-tight py-14 grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted"><Building2 className="h-5 w-5"/></div>
              <span className="font-display text-lg font-semibold">Brand OS</span>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Your Brand. Everywhere. Always.</p>
          </div>
          <nav className="grid gap-2 text-sm">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Product</span>
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#solutions" className="hover:text-foreground">Solutions</a>
            <a href="#showcase" className="hover:text-foreground">Showcase</a>
            <a href="#pricing" className="hover:text-foreground">Pricing</a>
          </nav>
          <nav className="grid gap-2 text-sm">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Company</span>
            <a href="#" className="hover:text-foreground">About</a>
            <a href="#" className="hover:text-foreground">Blog</a>
            <a href="#" className="hover:text-foreground">Careers</a>
            <a href="#" className="hover:text-foreground">Contact</a>
          </nav>
          <div>
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Stay in the loop</span>
            <form className="mt-3 flex gap-2">
              <Input className="input-pill h-10 px-4" placeholder="Your email" aria-label="Email" />
              <Button variant="hero" shape="pill" className="h-10 px-5">Join</Button>
            </form>
            <div className="mt-4 flex items-center gap-3 text-muted-foreground">
              <a href="#" aria-label="Twitter" className="hover:text-foreground"><Twitter className="h-5 w-5"/></a>
              <a href="#" aria-label="GitHub" className="hover:text-foreground"><Github className="h-5 w-5"/></a>
              <a href="#" aria-label="LinkedIn" className="hover:text-foreground"><Linkedin className="h-5 w-5"/></a>
            </div>
          </div>
        </div>
        <div className="border-t border-border">
          <div className="container-tight py-6 text-xs text-muted-foreground flex flex-col md:flex-row items-center justify-between gap-4">
            <div>© {new Date().getFullYear()} Brand OS — Your Brand. Everywhere. Always.</div>
            <div className="flex gap-5">
              <a href="#" className="hover:text-foreground">Privacy</a>
              <a href="#" className="hover:text-foreground">Terms</a>
              <a href="#" className="hover:text-foreground">Status</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
