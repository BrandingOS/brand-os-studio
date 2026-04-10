import type { ProductModuleData } from '@/domains/landing/types';

interface ProductModuleCardProps extends ProductModuleData {
  index: number;
}

export const ProductModuleCard = ({
  icon: Icon,
  title,
  description,
  image,
}: ProductModuleCardProps) => {
  return (
    <article
      className="group relative overflow-hidden rounded-[var(--radius)] border border-border bg-[hsl(var(--card))] shadow-soft flex flex-col h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated hover:border-accent-pop/40">
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-[hsl(0_0%_5%)]">
          <img
            src={image}
            alt={title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.04]"
          />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent-pop/55 to-transparent" />
        </div>

        <div className="p-6 flex-1 flex flex-col">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-accent-pop/40 bg-accent-pop/10 text-accent-pop">
            <Icon className="h-4.5 w-4.5" />
          </div>
          <h4 className="mt-4 font-display text-lg font-bold tracking-tight text-foreground">
            {title}
          </h4>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed flex-1">
            {description}
          </p>
        </div>
    </article>
  );
};
