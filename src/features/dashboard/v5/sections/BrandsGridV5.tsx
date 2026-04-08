import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowUpRight, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Brand } from '@/shared/types/brand';

interface BrandsGridV5Props {
  brands: Brand[];
  onCreateBrand: () => void;
}

export function BrandsGridV5({ brands, onCreateBrand }: BrandsGridV5Props) {
  const navigate = useNavigate();
  const visible = brands.slice(0, 6);
  const more = Math.max(0, brands.length - visible.length);

  if (brands.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-border bg-card/30 p-10 text-center">
        <h3 className="font-display text-xl font-semibold text-foreground">No brands yet</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Your brands will live here. Build a logo, define colors, write voice — ship a portal in minutes.
        </p>
        <button
          type="button"
          onClick={onCreateBrand}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Create your first brand
        </button>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-[-0.01em] text-foreground">Your brands</h2>
          <p className="text-sm text-muted-foreground">{brands.length} brand{brands.length === 1 ? '' : 's'} in your workspace</p>
        </div>
        {brands.length > 6 && (
          <button
            type="button"
            onClick={() => navigate('/dashboard/brands')}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            View all →
          </button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visible.map((brand) => (
          <BrandCardV5 key={brand.id} brand={brand} />
        ))}
        {more > 0 && (
          <button
            type="button"
            onClick={() => navigate('/dashboard/brands')}
            className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/30 text-center transition hover:border-primary/40 hover:bg-card/50"
          >
            <div className="font-display text-3xl font-bold text-foreground">+{more}</div>
            <div className="mt-1 text-xs text-muted-foreground">more brands</div>
          </button>
        )}
      </div>
    </section>
  );
}

function BrandCardV5({ brand }: { brand: Brand }) {
  const navigate = useNavigate();
  const initial = brand.name?.charAt(0).toUpperCase() ?? '?';
  const updated = new Date(brand.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <article
      onClick={() => navigate(`/b/${brand.slug}`)}
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-2xl border border-border bg-card p-5 transition',
        'hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_24px_60px_-24px_hsl(var(--primary)/0.4)]',
      )}
    >
      {/* Color glow */}
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-30 blur-3xl transition group-hover:opacity-50"
        style={{ backgroundColor: brand.primaryColor }}
      />

      <header className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {brand.logo ? (
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background p-1.5">
              <img src={brand.logo} alt={brand.name} className="max-h-full max-w-full object-contain" />
            </div>
          ) : (
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-base font-bold text-white shadow-inner"
              style={{ backgroundColor: brand.primaryColor }}
            >
              {initial}
            </div>
          )}
          <div className="leading-tight">
            <h3 className="font-display text-base font-semibold text-foreground">{brand.name}</h3>
            <p className="text-[11px] text-muted-foreground">Updated {updated}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="rounded-md p-1 text-muted-foreground opacity-0 transition hover:bg-muted/40 hover:text-foreground group-hover:opacity-100"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </header>

      <div className="relative mt-4 space-y-3">
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{brand.tone} · {brand.audience}</p>

        {/* Color row */}
        <div className="flex items-center gap-1.5">
          <div
            className="h-5 w-5 rounded-md border border-border shadow-inner"
            style={{ backgroundColor: brand.primaryColor }}
          />
          {brand.secondaryColor && (
            <div
              className="h-5 w-5 rounded-md border border-border shadow-inner"
              style={{ backgroundColor: brand.secondaryColor }}
            />
          )}
          <span className="ml-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            {brand.assets?.length ?? 0} assets
          </span>
        </div>
      </div>

      <footer className="relative mt-5 flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/b/${brand.slug}/identity`);
            }}
            className="text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
          >
            Identity
          </button>
          <span className="text-muted-foreground/40">·</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/b/${brand.slug}/assets`);
            }}
            className="text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
          >
            Assets
          </button>
          <span className="text-muted-foreground/40">·</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/b/${brand.slug}/guidelines`);
            }}
            className="text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
          >
            Guidelines
          </button>
        </div>
        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition group-hover:text-foreground" />
      </footer>
    </article>
  );
}
