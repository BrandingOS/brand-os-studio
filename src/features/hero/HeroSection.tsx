import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/shared/components/Badge";
import { FloatingTiles } from "./FloatingTiles";
import { heroContent } from "@/data/landing";

export const HeroSection = () => {
  return (
    <section className="section bg-dot-grid">
      <div className="container-tight">
        <div className="mx-auto text-center max-w-3xl my-[1rem]" data-animate>
          <Badge className={heroContent.badge.className}>
            Set <span className="arrow-pulse"> → </span> Sync <span className="arrow-pulse"> → </span> Shine
          </Badge>
          
          <h1 className="mt-4 font-display text-4xl sm:text-5xl md:text-6xl leading-tight font-extrabold">
            {heroContent.headline}
          </h1>
          
          <p className="mt-4 text-lg text-muted-foreground">
            {heroContent.description}
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
                {heroContent.cta.primary.text}
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

          <img 
            src={heroContent.heroImageUrl} 
            alt={heroContent.heroImageAlt} 
            loading="eager" 
            className="w-full rounded-3xl shadow-elegant relative" 
          />
          
          <FloatingTiles />
        </div>
      </div>
    </section>
  );
};