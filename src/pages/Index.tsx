import { useEffect } from "react";
import heroImage from "@/assets/hero-dashboard.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Palette, Upload, Wand2, Globe, Layout, Download, Printer, FileStack, Play, Rocket, Building2, Share2, Twitter, Github, Linkedin } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SectionSplit from "@/components/sections/SectionSplit";
import Pricing from "@/components/sections/Pricing";

// nav items moved into Navbar component

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
      <Navbar />

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
              <div className="mt-8 mx-auto max-w-md">
                <form className="flex items-center gap-2 justify-center" data-animate>
                  <Input className="w-64 input-pill h-12 px-5" placeholder="Enter your brand name" aria-label="Brand name" />
                  <Button variant="hero" shape="pill" className="h-12 px-6">Start Now</Button>
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
        <section id="how" className="section bg-dot-grid">
          <div className="container-tight">
            <h2 data-animate className="text-3xl font-semibold text-center mb-10">Set It Up Once. Brand Everything.</h2>
            <div className="space-y-10">
              <SectionSplit title="Upload Core Assets" subtitle="Logo, colors, fonts, voice — your source of truth." />
              <SectionSplit title="Auto‑Generate Everything" subtitle="Guidelines, templates, print files, even a website." />
              <SectionSplit title="Use Anywhere" subtitle="Download, export, or publish instantly." />
            </div>
          </div>
        </section>

        {/* Why + All-in-One (Dark continuous) */}
        <section className="section panel-dark bg-dot-grid">
          <div className="container-tight">
            <div className="relative overflow-hidden rounded-tl-3xl rounded-tr-none rounded-b-3xl p-10 md:p-14 animate-gradient-shift">
              <span className="inline-block rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">Why Brand OS</span>
              <h2 className="mt-4 text-3xl md:text-4xl font-semibold">More than guidelines — your brand OS.</h2>
              <p className="mt-3 text-base text-muted-foreground max-w-2xl">Live brand logic that auto‑applies to every output — from slides and posts to print and your website. One source of truth, used everywhere.</p>
              <div className="mt-6">
                <Button variant="glass" shape="pill" className="bg-background text-foreground">Explore Modules</Button>
              </div>
            </div>

            <div className="mt-10" id="features">
              <h3 data-animate className="text-3xl font-semibold text-center">All‑in‑One Branding Powerhouse</h3>
              <div className="mt-10 space-y-6">
                {/* Large Feature Rows */}
                <div className="grid items-center gap-6 md:grid-cols-5 card-soft p-6" data-animate>
                  <div className="md:col-span-2">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted"><Layout className="h-6 w-6"/></div>
                    <h4 className="mt-3 text-xl font-semibold">Live Brand Guidelines</h4>
                    <p className="text-sm text-muted-foreground">Instantly updated, shareable, beautiful.</p>
                  </div>
                  <div className="md:col-span-3">
                    <div className="aspect-video rounded-2xl glass-surface" />
                  </div>
                </div>
                <div className="grid items-center gap-6 md:grid-cols-5 card-soft p-6" data-animate>
                  <div className="md:col-span-2">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted"><Palette className="h-6 w-6"/></div>
                    <h4 className="mt-3 text-xl font-semibold">Design Studio</h4>
                    <p className="text-sm text-muted-foreground">Create on‑brand designs without leaving the OS.</p>
                  </div>
                  <div className="md:col-span-3">
                    <div className="aspect-video rounded-2xl glass-surface" />
                  </div>
                </div>
                <div className="grid items-center gap-6 md:grid-cols-5 card-soft p-6" data-animate>
                  <div className="md:col-span-2">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted"><Printer className="h-6 w-6"/></div>
                    <h4 className="mt-3 text-xl font-semibold">Print & Collateral</h4>
                    <p className="text-sm text-muted-foreground">Auto‑generate business cards, letterheads, packaging.</p>
                  </div>
                  <div className="md:col-span-3">
                    <div className="aspect-video rounded-2xl glass-surface" />
                  </div>
                </div>
                <div className="grid items-center gap-6 md:grid-cols-5 card-soft p-6" data-animate>
                  <div className="md:col-span-2">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted"><Download className="h-6 w-6"/></div>
                    <h4 className="mt-3 text-xl font-semibold">Brand Export</h4>
                    <p className="text-sm text-muted-foreground">One‑click full brand folder, perfectly organized.</p>
                  </div>
                  <div className="md:col-span-3">
                    <div className="aspect-video rounded-2xl glass-surface" />
                  </div>
                </div>
                <div className="grid items-center gap-6 md:grid-cols-5 card-soft p-6" data-animate>
                  <div className="md:col-span-2">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted"><Globe className="h-6 w-6"/></div>
                    <h4 className="mt-3 text-xl font-semibold">Website Builder</h4>
                    <p className="text-sm text-muted-foreground">Launch a branded site in hours, not weeks.</p>
                  </div>
                  <div className="md:col-span-3">
                    <div className="aspect-video rounded-2xl glass-surface" />
                  </div>
                </div>
                <div className="grid items-center gap-6 md:grid-cols-5 card-soft p-6" data-animate>
                  <div className="md:col-span-2">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted"><Wand2 className="h-6 w-6"/></div>
                    <h4 className="mt-3 text-xl font-semibold">Smart AI Assist</h4>
                    <p className="text-sm text-muted-foreground">Suggestions for colors, layouts, and copy.</p>
                  </div>
                  <div className="md:col-span-3">
                    <div className="aspect-video rounded-2xl glass-surface" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Proof / Stats */}
        <section className="section bg-secondary bg-dot-grid">
          <div className="container-tight grid gap-8 sm:grid-cols-3">
            <Stat value="80%" label="Brand Recognition Boost" />
            <Stat value="10–20%" label="Revenue Growth through Consistency" />
            <Stat value="87%" label="Consumer Trust for Consistent Brands" />
          </div>
        </section>

        {/* Pricing */}
        <Pricing />

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

      <Footer />
    </div>
  );
};

export default Index;
