import type { ReactNode } from 'react';

/**
 * Read-only analogue of SetupBoard's internal `Section` wrapper.
 *
 * Renders the same `.section` / `.section-header` / `.section-body`
 * classes so it inherits the cosmos editorial rhythm, but drops the
 * "+" add button and export tray — Brand Kit v2 (cosmos) is read-only
 * until the mutation follow-up ships.
 */
export function KitSection({
  dataKey,
  title,
  spec,
  sectionRef,
  children,
}: {
  dataKey: string;
  title: string;
  spec?: string;
  sectionRef?: (el: HTMLElement | null) => void;
  children: ReactNode;
}) {
  return (
    <section ref={sectionRef} className="section" data-key={dataKey}>
      <div className="section-header">
        <h2>{title}</h2>
        {spec && <span className="section-spec">{spec}</span>}
      </div>
      <div className="section-body">{children}</div>
    </section>
  );
}
