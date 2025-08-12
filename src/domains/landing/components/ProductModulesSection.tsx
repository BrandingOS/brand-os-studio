import { Button } from "@/components/ui/button";
import { productModules } from "../data/content";
import { ProductModuleCard } from "./ProductModuleCard";

export const ProductModulesSection = () => {
  return (
    <section className="section panel-dark bg-dot-grid">
      <div className="container-tight">
        <div className="relative overflow-hidden rounded-tl-3xl rounded-tr-none rounded-b-3xl p-10 md:p-14 animate-gradient-shift max-w-5xl mx-auto text-center flex flex-col items-center justify-center">
          <span className="inline-block rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
            Why Brand OS
          </span>
          <h2 className="mt-4 text-3xl md:text-4xl font-semibold">
            More than guidelines — your brand OS.
          </h2>
          <p className="mt-3 text-base text-muted-foreground max-w-2xl">
            Live brand logic that auto‑applies to every output — from slides and posts to print and your website. One source of truth, used everywhere.
          </p>
          <div className="mt-6">
            <Button variant="glass" shape="pill" className="bg-background text-foreground">
              Explore Modules
            </Button>
          </div>
        </div>

        <div className="mt-10" id="features">
          <h3 data-animate className="text-3xl font-semibold text-center">
            All‑in‑One Branding Powerhouse
          </h3>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {productModules.map((module, index) => (
              <ProductModuleCard key={index} {...module} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};