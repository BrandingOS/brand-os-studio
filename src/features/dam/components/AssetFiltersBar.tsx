import * as React from 'react';
import { Search, LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssetFiltersBarProps {
  categories: readonly string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  view: 'grid' | 'list';
  onViewChange: (view: 'grid' | 'list') => void;
  totalCount: number;
  filteredCount: number;
}

export function AssetFiltersBar({
  categories,
  activeCategory,
  onCategoryChange,
  search,
  onSearchChange,
  view,
  onViewChange,
  totalCount,
  filteredCount,
}: AssetFiltersBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Categories */}
      <div className="-mx-1 flex flex-wrap items-center gap-1">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onCategoryChange(c)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition',
              activeCategory === c
                ? 'border-primary/60 bg-primary/10 text-foreground'
                : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground',
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Right side: search + view */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search assets…"
            className="w-48 rounded-md border border-border bg-card py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
        <div className="flex items-center rounded-md border border-border bg-card">
          <button
            type="button"
            onClick={() => onViewChange('grid')}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-l-md transition',
              view === 'grid' ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onViewChange('list')}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-r-md transition',
              view === 'list' ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
            aria-label="List view"
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {filteredCount}/{totalCount}
        </span>
      </div>
    </div>
  );
}
