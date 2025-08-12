import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layout, Printer, Globe } from "lucide-react";
import { Badge } from "@/shared/components/Badge";

const heroImage = "https://i.pinimg.com/1200x/18/ec/a2/18eca28a85c40aa0b255742cbe3a0656.jpg";

export const HeroSection = () => {
  return (
    <section className="section bg-dot-grid">
      <div className="container-tight">
        <div className="mx-auto text-center max-w-3xl my-[1rem]" data-animate>
          <Badge>
            One-time setup <span className="arrow-pulse"> → </span> Endless consistency
          </Badge>
          <h1 className="mt-4 font-display text-4xl sm:text-5xl md:text-6xl leading-tight font-extrabold">
            Save hours of repetitive boring work
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Create your brand system once—our platform syncs it across every asset automatically.
          </p>
          <div className="mt-8 mx-auto max-w-md">
            <form
              className="flex flex-col md:flex-row items-center gap-2 justify-center"
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
  );
};