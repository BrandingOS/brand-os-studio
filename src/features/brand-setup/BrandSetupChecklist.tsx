// Phase 11.2 — Brand setup checklist widget.
//
// Progress card surfaced on the brand-kit page. Counts completed
// starter steps (colors, logo, typography, voice) and renders a
// row per step with a link to the page that completes it. When
// every step is done, the widget hides itself entirely so a fully-
// configured brand doesn't see permanent "everything done" noise.
//
// Reads brand state synchronously via computeBrandSetupSteps —
// callers don't need to await any service.

import { Link } from 'react-router-dom';
import { Check, Circle, ChevronRight } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';
import { computeBrandSetupSteps } from './computeBrandSetupSteps';

interface BrandSetupChecklistProps {
  brand: Brand;
  className?: string;
}

export function BrandSetupChecklist({ brand, className }: BrandSetupChecklistProps) {
  const steps = computeBrandSetupSteps(brand);
  const done = steps.filter((s) => s.done).length;
  const total = steps.length;
  if (done === total) return null;

  const pct = Math.round((done / total) * 100);

  return (
    <section
      data-brand-setup-checklist
      data-progress={`${done}/${total}`}
      className={
        'rounded-xl border border-border bg-card p-5 ' +
        (className ?? '')
      }
      aria-label="Brand setup progress"
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">
            Set up your brand
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Finish these starter steps so AI suggestions and templates feel on-brand.
          </p>
        </div>
        <div
          className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium tabular-nums"
          aria-label={`${done} of ${total} steps complete`}
        >
          {done} / {total}
        </div>
      </div>

      <div
        className="h-1.5 w-full rounded-full bg-muted overflow-hidden mb-4"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          data-brand-setup-progress-fill
          className="h-full bg-primary transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="flex flex-col gap-1" role="list">
        {steps.map((step) => (
          <li key={step.id}>
            <Link
              to={step.href}
              data-step-id={step.id}
              data-step-done={step.done}
              className={
                'flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/40 ' +
                (step.done ? 'text-muted-foreground' : 'text-foreground')
              }
            >
              {step.done ? (
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  aria-hidden
                >
                  <Check size={12} />
                </span>
              ) : (
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full border border-border"
                  aria-hidden
                >
                  <Circle size={8} />
                </span>
              )}
              <span className={step.done ? 'line-through' : ''}>{step.label}</span>
              {!step.done ? (
                <ChevronRight
                  size={14}
                  className="ml-auto text-muted-foreground"
                  aria-hidden
                />
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
