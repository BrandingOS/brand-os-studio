import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  variant?: 'default' | 'secondary' | 'dark';
  container?: boolean;
}

const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ className, variant = 'default', container = true, children, ...props }, ref) => {
    const sectionClasses = cn(
      "section",
      {
        'bg-background': variant === 'default',
        'bg-secondary bg-dot-grid': variant === 'secondary',
        'bg-primary text-primary-foreground': variant === 'dark',
      },
      className
    );

    const content = container ? (
      <div className="container-tight">{children}</div>
    ) : children;

    return (
      <section ref={ref} className={sectionClasses} {...props}>
        {content}
      </section>
    );
  }
);
Section.displayName = "Section";

export { Section };