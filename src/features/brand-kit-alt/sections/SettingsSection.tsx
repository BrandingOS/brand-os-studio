/**
 * SettingsSection — embeds the canonical BrandSettingsHub as the first
 * section of the Brand Kit page.
 */
import * as React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { SectionHeader } from '../SectionHeader';
import { BrandSettingsHub } from '../BrandSettingsHub';

interface SettingsSectionProps {
  slug: string;
}

export function SettingsSection({ slug }: SettingsSectionProps) {
  return (
    <section>
      <SectionHeader
        eyebrow="Brand Hub"
        title="Settings"
        subtitle="The single source of truth — every change here updates every asset, every page, every export."
        action={
          <Link
            to={`/b/${slug}/settings`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:border-primary/40"
          >
            <ArrowUpRight className="h-3 w-3" />
            Standalone view
          </Link>
        }
      />
      <BrandSettingsHub />
    </section>
  );
}
