import type { ProductModuleData } from "../types";

export const ProductModuleCard = ({ icon: Icon, title, description, image }: ProductModuleData) => {
  return (
    <div className="feature-gradient feature-stroke p-6 rounded-2xl panel-dark" data-animate>
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-accent/40 bg-transparent">
        <Icon className="h-6 w-6" />
      </div>
      <h4 className="mt-3 text-xl font-semibold">{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
      <img 
        src={image} 
        alt={`Grayscale illustration of ${title.toLowerCase()}`} 
        loading="lazy" 
        className="mt-4 rounded-xl w-full h-28 object-cover opacity-90" 
      />
    </div>
  );
};