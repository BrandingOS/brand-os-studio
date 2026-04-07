import { EarlyAccessForm } from '@/components/EarlyAccessForm';

/**
 * Final CTA — Relume-style "boxed dark hero" outro.
 *
 * Single dark surface with bold display headline + early access form.
 * No buttons row. The email form IS the CTA.
 */
export const FinalCTASection = () => {
  return (
    <section className="section">
      <div className="container-tight">
        <div className="surface-dark px-8 md:px-16 py-20 md:py-28 text-center">
          <span
            className="eyebrow text-background/80 [&::before]:bg-background/40"
            data-animate
          >
            Get early access
          </span>
          <h2
            className="display mt-8 text-background"
            data-animate
          >
            Brand once.
            <br />
            Use forever.
          </h2>
          <p
            className="mt-6 text-lg text-background/70 max-w-xl mx-auto leading-relaxed"
            data-animate
          >
            Join the early access list — be first when Brand OS launches.
          </p>
          <div className="mt-10 max-w-md mx-auto" data-animate>
            <EarlyAccessForm
              variant="stacked"
              buttonLabel="Request Early Access"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
