/**
 * MockupsSection — photo-realistic logo applications.
 *
 * Reuses the existing mockups template library; deep-links to the
 * legacy mockups module for full editing.
 */
import * as React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';
import { getTemplatesForModule } from '@/features/brandkit/data/templates';
import { SectionHeader } from '../SectionHeader';
import { TemplateRow } from './TemplateRow';

interface MockupsSectionProps {
  brand: Brand;
  slug: string;
}

export function MockupsSection({ brand, slug }: MockupsSectionProps) {
  const mockups = React.useMemo(() => getTemplatesForModule('mockups'), []);

  return (
    <section>
      <SectionHeader
        eyebrow="Templates"
        title="Mockups"
        subtitle="See your brand applied to devices, apparel, print, and environments."
        count={mockups.length}
        action={
          <Link
            to={`/b/${slug}/brandkit/mockups`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:border-primary/40"
          >
            <ArrowUpRight className="h-3 w-3" />
            Open mockups
          </Link>
        }
      />
      <TemplateRow brand={brand} slug={slug} templates={mockups} moduleId="mockups" />
    </section>
  );
}
