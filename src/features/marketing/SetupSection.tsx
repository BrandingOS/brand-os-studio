import { sectionContent, sectionMetadata } from "@/data/landing";
import SectionSplit from "@/components/sections/SectionSplit";

export const SetupSection = () => {
  const section = sectionMetadata.setup;

  return (
    <section className={section.className} id={section.id}>
      <div className="container-tight">
        <h2 data-animate className="text-3xl font-semibold text-center mb-10">
          {section.headline}
        </h2>
        <div className="space-y-10">
          {sectionContent.map((content) => (
            <SectionSplit
              key={content.id}
              title={content.title}
              subtitle={content.subtitle}
            >
              <img
                src={content.imageUrl}
                alt={content.altText}
                loading="lazy"
                className="rounded-2xl w-full h-auto object-cover card-soft"
              />
            </SectionSplit>
          ))}
        </div>
      </div>
    </section>
  );
};