import { Button } from "@/components/ui/button";
import { productModules, sectionMetadata } from "@/data/landing";
import { ProductModuleCard } from "./ProductModuleCard";

export const ProductModulesSection = () => {
  const section = sectionMetadata.features;

  return (
    <section className={section.className}>
      <div className="container-tight">
        {/* Why Brand OS intro */}
        <div className="relative overflow-hidden rounded-tl-3xl rounded-tr-none rounded-b-3xl p-10 md:p-14 animate-gradient-shift max-w-5xl mx-auto text-center flex flex-col items-center justify-center">
          <span className="inline-block rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
            Why Brand OS
          </span>
          <h2 className="mt-4 text-3xl md:text-4xl font-semibold">
            {section.subtitle}
          </h2>
          <p className="mt-3 text-base text-muted-foreground max-w-2xl">
            {section.description}
          </p>
          <div className="mt-6">
            <Button variant="glass" shape="pill" className="bg-background text-foreground">
              Explore Modules
            </Button>
          </div>
        </div>

        {/* Product modules grid */}
        <div className="mt-10" id={section.id}>
          <h3 data-animate className="text-3xl font-semibold text-center">
            {section.headline}
          </h3>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {productModules.map((module) => (
              <ProductModuleCard key={module.id} module={module} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};