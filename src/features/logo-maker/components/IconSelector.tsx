import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { ICON_CATEGORIES } from '../data/icons';
import { Search } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface IconSelectorProps {
  selected: string | null;
  onSelect: (icon: string) => void;
}

export function IconSelector({ selected, onSelect }: IconSelectorProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filteredCategories = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q && activeCategory === 'all') return ICON_CATEGORIES;

    return ICON_CATEGORIES
      .filter((cat) => activeCategory === 'all' || cat.id === activeCategory)
      .map((cat) => ({
        ...cat,
        icons: cat.icons.filter((icon) => icon.toLowerCase().includes(q)),
      }))
      .filter((cat) => cat.icons.length > 0);
  }, [search, activeCategory]);

  const renderIcon = (name: string) => {
    const Icon = (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[name];
    if (!Icon) return null;
    return <Icon className="w-5 h-5" />;
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search icons..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 flex-wrap">
        <button
          onClick={() => setActiveCategory('all')}
          className={cn(
            'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
            activeCategory === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:text-foreground',
          )}
        >
          All
        </button>
        {ICON_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
              activeCategory === cat.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground',
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Icon grid */}
      <div className="flex-1 overflow-y-auto -mx-1 pr-1 space-y-4">
        {filteredCategories.map((cat) => (
          <div key={cat.id}>
            <p className="text-xs font-medium text-muted-foreground mb-2 px-1">{cat.label}</p>
            <div className="grid grid-cols-6 gap-1">
              {cat.icons.map((icon) => (
                <button
                  key={`${cat.id}-${icon}`}
                  onClick={() => onSelect(icon)}
                  title={icon}
                  className={cn(
                    'aspect-square rounded-lg flex items-center justify-center transition-all',
                    'hover:bg-accent hover:text-accent-foreground',
                    selected === icon
                      ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                      : 'text-muted-foreground',
                  )}
                >
                  {renderIcon(icon)}
                </button>
              ))}
            </div>
          </div>
        ))}
        {filteredCategories.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No icons found for "{search}"
          </p>
        )}
      </div>
    </div>
  );
}
