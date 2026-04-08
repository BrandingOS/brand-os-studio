/**
 * SocialSection — IG posts, IG stories, FB covers, presentations.
 */
import * as React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Instagram, Facebook, Presentation } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';
import { getTemplatesForModule } from '@/features/brandkit/data/templates';
import { SectionHeader } from '../SectionHeader';
import { TemplateRow } from './TemplateRow';

interface SocialSectionProps {
  brand: Brand;
  slug: string;
}

export function SocialSection({ brand, slug }: SocialSectionProps) {
  const igPosts = React.useMemo(() => getTemplatesForModule('instagram-posts'), []);
  const igStories = React.useMemo(() => getTemplatesForModule('instagram-stories'), []);
  const fbCovers = React.useMemo(() => getTemplatesForModule('facebook-covers'), []);
  const presentations = React.useMemo(() => getTemplatesForModule('presentations'), []);
  const total = igPosts.length + igStories.length + fbCovers.length + presentations.length;

  return (
    <section>
      <SectionHeader
        eyebrow="Templates"
        title="Social & Screen"
        subtitle="Pre-sized templates for every platform."
        count={total}
        action={
          <Link
            to={`/b/${slug}/brandkit/instagram-posts`}
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
            <Instagram className="h-3 w-3" />
            Instagram posts · {igPosts.length}
          </h3>
          <TemplateRow brand={brand} slug={slug} templates={igPosts} moduleId="instagram-posts" />
        </div>

        <div>
          <h3 className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            <Instagram className="h-3 w-3" />
            Instagram stories · {igStories.length}
          </h3>
          <TemplateRow brand={brand} slug={slug} templates={igStories} moduleId="instagram-stories" />
        </div>

        <div>
          <h3 className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            <Facebook className="h-3 w-3" />
            Facebook covers · {fbCovers.length}
          </h3>
          <TemplateRow brand={brand} slug={slug} templates={fbCovers} moduleId="facebook-covers" />
        </div>

        <div>
          <h3 className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            <Presentation className="h-3 w-3" />
            Presentations · {presentations.length}
          </h3>
          <TemplateRow brand={brand} slug={slug} templates={presentations} moduleId="presentations" />
        </div>
      </div>
    </section>
  );
}
