import React from "react";

interface SectionSplitProps {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}

export default function SectionSplit({ title, subtitle, children }: SectionSplitProps) {
  return (
    <div className="grid items-center gap-8 md:grid-cols-2" data-animate>
      <div>
        <h3 className="text-2xl md:text-3xl font-semibold">{title}</h3>
        <p className="mt-2 text-muted-foreground">{subtitle}</p>
      </div>
      <div>
        {children ?? (
          <div className="relative overflow-hidden rounded-2xl card-soft aspect-video">
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-48 w-48 rounded-full border border-border/50 animate-ripple-slow" />
              <div className="absolute h-64 w-64 rounded-full border border-border/30 animate-ripple-slow [animation-delay:0.8s]" />
            </div>
            <div className="absolute inset-0 grid place-items-center">
              <span className="text-xs text-muted-foreground">Visual Preview</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
