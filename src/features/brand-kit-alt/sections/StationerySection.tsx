/**
 * StationerySection — business cards + invoices.
 *
 * Reuses the existing template library from the brandkit feature so
 * Brand Kit v2 stays in sync with the legacy brandkit pages.
 */
import * as React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CreditCard, FileText } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';
import { getTemplatesForModule } from '@/features/brandkit/data/templates';
import { SectionHeader } from '../SectionHeader';
import { TemplateRow } from './TemplateRow';

interface StationerySectionProps {
  brand: Brand;
  slug: string;
}

export function StationerySection({ brand, slug }: StationerySectionProps) {
  const businessCards = React.useMemo(() => getTemplatesForModule('business-cards'), []);
  const invoices = React.useMemo(() => getTemplatesForModule('invoices'), []);
  const total = businessCards.length + invoices.length;

  return (
    <section>
      <SectionHeader
        eyebrow="Templates"
        title="Stationery"
        subtitle="Business cards, invoices and other print collateral."
        count={total}
        action={
          <Link
            to={`/b/${slug}/brandkit/business-cards`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:border-primary/40"
          >
            <ArrowUpRight className="h-3 w-3" />
            Open editor
          </Link>
        }
      />

      <div className="space-y-6">
        <div>
          <h3 className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            <CreditCard className="h-3 w-3" />
            Business cards · {businessCards.length}
          </h3>
          <TemplateRow brand={brand} slug={slug} templates={businessCards} moduleId="business-cards" />
        </div>

        <div>
          <h3 className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            <FileText className="h-3 w-3" />
            Invoices · {invoices.length}
          </h3>
          <TemplateRow brand={brand} slug={slug} templates={invoices} moduleId="invoices" />
        </div>
      </div>
    </section>
  );
}
