import type { FeatureCardData } from '@/types';

export const FeatureCard = ({ icon: Icon, title, desc }: FeatureCardData) => (
  <div
    data-animate
    className="group card-soft rounded-2xl p-6 transition-transform hover:-translate-y-1.5"
  >
    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted">
      <Icon className="h-5 w-5 group-hover:animate-micro-bounce" />
    </div>
    <h3 className="mb-2 text-lg font-semibold">{title}</h3>
    <p className="text-sm text-muted-foreground">{desc}</p>
  </div>
);
