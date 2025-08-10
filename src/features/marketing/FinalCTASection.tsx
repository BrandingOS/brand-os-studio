import { Button } from "@/components/ui/button";
import { finalCTA, sectionMetadata } from "@/data/landing";

export const FinalCTASection = () => {
  const section = sectionMetadata.finalCTA;

  return (
    <section className={section.className}>
      <div className="container-tight text-center">
        <h2 data-animate className="text-3xl font-semibold">
          {finalCTA.headline}
        </h2>
        <p className="mt-3 text-lg text-muted-foreground" data-animate>
          {finalCTA.description}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3" data-animate>
          {finalCTA.buttons.map((button) => {
            const Icon = button.icon;
            return (
              <Button
                key={button.id}
                variant={button.variant as any}
                shape="pill"
                className="px-6 py-3"
              >
                <Icon className="mr-2" />
                {button.text}
              </Button>
            );
          })}
        </div>
      </div>
    </section>
  );
};