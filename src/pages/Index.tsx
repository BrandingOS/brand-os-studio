import { useEffect } from "react";
// import heroImage from "@/assets/hero-dashboard.png";
const heroImage =
  "https://i.pinimg.com/1200x/18/ec/a2/18eca28a85c40aa0b255742cbe3a0656.jpg";
import illusUploadCoreAssets from "@/assets/illus-upload-core-assets.webp";
import illusAutoGenerate from "@/assets/illus-auto-generate.webp";
import illusUseAnywhere from "@/assets/illus-use-anywhere.webp";
import illusGuidelines from "@/assets/illus-guidelines.webp";
import illusDesignStudio from "@/assets/illus-design-studio.webp";
import illusPrintCollateral from "@/assets/illus-print-collateral.webp";
import illusBrandExport from "@/assets/illus-brand-export.webp";
import illusWebsiteBuilder from "@/assets/illus-website-builder.webp";
import illusSmartAI from "@/assets/illus-smart-ai.webp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Palette, Upload, Wand2, Globe, Layout, Download, Printer, FileStack, Play, Rocket } from "lucide-react";
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
    <div className="text-4xl font-semibold">{value}</div>
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
            <div className="mx-auto text-center max-w-3xl my-[1rem]" data-animate>
            <Badge variant="outline" className="badge-orbit text-white">
              Set <span className="arrow-pulse"> → </span> Sync <span className="arrow-pulse"> → </span> Shine
            </Badge>
              <h1 className="mt-4 font-display text-4xl sm:text-5xl md:text-6xl leading-tight font-extrabold">
                Save hours of repetitive boring work
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Create your brand system once—our platform syncs it across every asset automatically.
              </p>
              <div className="mt-8 mx-auto max-w-md">
               <form
  className="
    flex flex-col md:flex-row
    items-center gap-2 justify-center
  "
  data-animate
>
  <Input
    className="w-full md:w-64 input-pill h-12 px-5 text-center"
    placeholder="Enter your brand name"
    aria-label="Brand name"
  />
  <Button
    variant="hero"
    shape="pill"
    className="h-12 px-6 w-full md:w-auto"
  >
    Start Now
  </Button>
</form>
                {/* <p className="mt-2 text-xs text-muted-foreground">No credit card required.</p> */}
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

        {/* Marquee */}
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
                {/* duplicate for seamless loop */}
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
        <section id="how" className="section bg-dot-grid" id="setup">
          <div className="container-tight">
            <h2 data-animate className="text-3xl font-semibold text-center mb-10">Set It Up Once. Brand Everything.</h2>
            <div className="space-y-10">
              <SectionSplit title="Upload Core Assets" subtitle="Logo, colors, fonts, voice — your source of truth.">
                <img src={illusUploadCoreAssets} alt="Grayscale illustration of uploading core brand assets" loading="lazy" className="rounded-2xl w-full h-auto object-cover card-soft" />
              </SectionSplit>
              <SectionSplit title="Auto‑Generate Everything" subtitle="Guidelines, templates, print files, even a website.">
                <img src={illusAutoGenerate} alt="Grayscale illustration of auto-generating brand outputs" loading="lazy" className="rounded-2xl w-full h-auto object-cover card-soft" />
              </SectionSplit>
              <SectionSplit title="Use Anywhere" subtitle="Download, export, or publish instantly.">
                <img src={illusUseAnywhere} alt="Grayscale illustration of publishing and exporting brand assets" loading="lazy" className="rounded-2xl w-full h-auto object-cover card-soft" />
              </SectionSplit>
            </div>
          </div>
        </section>

        {/* Why + All-in-One (Dark continuous) */}
        <section className="section panel-dark bg-dot-grid">
          <div className="container-tight">
            <div className="relative overflow-hidden rounded-tl-3xl rounded-tr-none rounded-b-3xl p-10 md:p-14 animate-gradient-shift max-w-5xl mx-auto text-center flex flex-col items-center justify-center">
              <span className="inline-block rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">Why Brand OS</span>
              <h2 className="mt-4 text-3xl md:text-4xl font-semibold">More than guidelines — your brand OS.</h2>
              <p className="mt-3 text-base text-muted-foreground max-w-2xl">Live brand logic that auto‑applies to every output — from slides and posts to print and your website. One source of truth, used everywhere.</p>
              <div className="mt-6">
                <Button variant="glass" shape="pill" className="bg-background text-foreground">Explore Modules</Button>
              </div>
            </div>

            <div className="mt-10" id="features">
              <h3 data-animate className="text-3xl font-semibold text-center">All‑in‑One Branding Powerhouse</h3>
              <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {/* Card 1 */}
                <div className="feature-gradient feature-stroke p-6 rounded-2xl panel-dark" data-animate>
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-accent/40 bg-transparent"><Layout className="h-6 w-6"/></div>
                  <h4 className="mt-3 text-xl font-semibold">Live Brand Guidelines</h4>
                  <p className="text-sm text-muted-foreground">Instantly updated, shareable, beautiful.</p>
                  <img src={illusGuidelines} alt="Grayscale illustration of live brand guidelines" loading="lazy" className="mt-4 rounded-xl w-full h-28 object-cover opacity-90" />
                </div>

                {/* Card 2 */}
                <div className="feature-gradient feature-stroke p-6 rounded-2xl panel-dark" data-animate>
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-accent/40 bg-transparent"><Palette className="h-6 w-6"/></div>
                  <h4 className="mt-3 text-xl font-semibold">Design Studio</h4>
                  <p className="text-sm text-muted-foreground">Create on‑brand designs without leaving the OS.</p>
                  <img src={illusDesignStudio} alt="Grayscale illustration of a design studio canvas" loading="lazy" className="mt-4 rounded-xl w-full h-28 object-cover opacity-90" />
                </div>

                {/* Card 3 */}
                <div className="feature-gradient feature-stroke p-6 rounded-2xl panel-dark" data-animate>
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-accent/40 bg-transparent"><Printer className="h-6 w-6"/></div>
                  <h4 className="mt-3 text-xl font-semibold">Print & Collateral</h4>
                  <p className="text-sm text-muted-foreground">Auto‑generate business cards, letterheads, packaging.</p>
                  <img src={illusPrintCollateral} alt="Grayscale illustration of print and collateral items" loading="lazy" className="mt-4 rounded-xl w-full h-28 object-cover opacity-90" />
                </div>

                {/* Card 4 */}
                <div className="feature-gradient feature-stroke p-6 rounded-2xl panel-dark" data-animate>
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-accent/40 bg-transparent"><Download className="h-6 w-6"/></div>
                  <h4 className="mt-3 text-xl font-semibold">Brand Export</h4>
                  <p className="text-sm text-muted-foreground">One‑click full brand folder, perfectly organized.</p>
                  <img src={illusBrandExport} alt="Grayscale illustration of brand export folders" loading="lazy" className="mt-4 rounded-xl w-full h-28 object-cover opacity-90" />
                </div>

                {/* Card 5 */}
                <div className="feature-gradient feature-stroke p-6 rounded-2xl panel-dark" data-animate>
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-accent/40 bg-transparent"><Globe className="h-6 w-6"/></div>
                  <h4 className="mt-3 text-xl font-semibold">Website Builder</h4>
                  <p className="text-sm text-muted-foreground">Launch a branded site in hours, not weeks.</p>
                  <img src={illusWebsiteBuilder} alt="Grayscale illustration of a website wireframe" loading="lazy" className="mt-4 rounded-xl w-full h-28 object-cover opacity-90" />
                </div>

                {/* Card 6 */}
                <div className="feature-gradient feature-stroke p-6 rounded-2xl panel-dark" data-animate>
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-accent/40 bg-transparent"><Wand2 className="h-6 w-6"/></div>
                  <h4 className="mt-3 text-xl font-semibold">Smart AI Assist</h4>
                  <p className="text-sm text-muted-foreground">Suggestions for colors, layouts, and copy.</p>
                  <img src={illusSmartAI} alt="Grayscale illustration of AI assistance for branding" loading="lazy" className="mt-4 rounded-xl w-full h-28 object-cover opacity-90" />
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
