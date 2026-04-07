import { EarlyAccessForm } from '@/components/EarlyAccessForm';

export const FinalCTASection = () => {
  return (
    <section className="section bg-dot-grid">
      <div className="container-tight text-center">
        <h2 data-animate className="text-3xl font-semibold">
          Brand Once. Use Forever.
        </h2>
        <p className="mt-3 text-lg text-muted-foreground" data-animate>
          Join the early access list — be first when Brand OS launches.
        </p>
        <div className="mt-8" data-animate>
          <EarlyAccessForm variant="stacked" buttonLabel="Request Early Access" />
        </div>
      </div>
    </section>
  );
};
