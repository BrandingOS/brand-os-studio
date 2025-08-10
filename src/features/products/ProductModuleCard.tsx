import { ProductModule } from "@/shared/types";

interface ProductModuleCardProps {
  module: ProductModule;
}

export const ProductModuleCard = ({ module }: ProductModuleCardProps) => {
  const Icon = module.icon;

  return (
    <div className="feature-gradient feature-stroke p-6 rounded-2xl panel-dark" data-animate>
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-accent/40 bg-transparent">
        <Icon className="h-6 w-6" />
      </div>
      <h4 className="mt-3 text-xl font-semibold">{module.title}</h4>
      <p className="text-sm text-muted-foreground">{module.description}</p>
      <img
        src={module.imageUrl}
        alt={`Illustration of ${module.title.toLowerCase()}`}
        loading="lazy"
        className="mt-4 rounded-xl w-full h-28 object-cover opacity-90"
      />
    </div>
  );
};