import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import type { FontRef } from '@/shared/types/typescale';
import {
  SYSTEM_FONT_CATALOG,
  ensureLoaded,
} from '@/shared/typography';
import { GOOGLE_FONTS_CATALOG } from '@/features/tools/ui-color-system/data/google-fonts-catalog';

interface Props {
  label: string;
  value: FontRef;
  onChange: (ref: FontRef) => void;
  /** Uploaded user fonts present in the current draft (any slot). */
  customFonts?: FontRef[];
}

type Category = 'custom' | 'system' | 'sans' | 'serif' | 'display' | 'mono';

const CATEGORY_ORDER: Category[] = ['custom', 'system', 'sans', 'serif', 'display', 'mono'];

const CATEGORY_LABEL: Record<Category, string> = {
  custom: 'Your uploads',
  system: 'System stacks',
  sans: 'Sans',
  serif: 'Serif',
  display: 'Display',
  mono: 'Mono',
};

function googleRefFor(name: string, category: 'serif' | 'sans' | 'display' | 'mono'): FontRef {
  const fallback =
    category === 'serif'
      ? 'ui-serif, Georgia, serif'
      : category === 'mono'
      ? 'ui-monospace, SFMono-Regular, monospace'
      : 'ui-sans-serif, system-ui, sans-serif';
  return {
    family: name,
    source: 'google',
    weights: [400, 700],
    italic: false,
    fallback,
  };
}

/**
 * FontPicker — popover + cmdk search with live font previews.
 * Replaces the native <select> in FontPairPanel so users can see what
 * they're picking. Google Fonts are lazy-loaded as items mount.
 */
export function FontPicker({ label, value, onChange, customFonts = [] }: Props) {
  const [open, setOpen] = useState(false);

  // Make sure the currently-selected font is actually loaded.
  // We key on family+source so a new FontRef with the same identity
  // doesn't cause needless re-loads.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { ensureLoaded(value); }, [value.family, value.source]);

  const groups = useMemo(() => {
    const g: Partial<Record<Category, Array<{ ref: FontRef; preview: string }>>> = {};
    const add = (cat: Category, ref: FontRef, preview: string) => {
      (g[cat] ??= []).push({ ref, preview });
    };

    // Uploaded fonts — dedupe by family name.
    const seen = new Set<string>();
    for (const r of customFonts) {
      if (seen.has(r.family)) continue;
      seen.add(r.family);
      add('custom', r, 'Your font');
    }

    for (const r of SYSTEM_FONT_CATALOG) add('system', r, 'Ag');

    for (const entry of GOOGLE_FONTS_CATALOG) {
      add(entry.category, googleRefFor(entry.name, entry.category), 'The quick brown fox');
    }

    return g;
  }, [customFonts]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="ts-fontpicker-trigger"
          aria-label={`${label} font`}
        >
          <span className="ts-fontpicker-label">{label}</span>
          <span
            className="ts-fontpicker-value"
            style={{ fontFamily: `"${value.family}", ${value.fallback}` }}
          >
            {value.family}
          </span>
          <ChevronDown size={14} className="ts-fontpicker-chevron" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-0 w-[360px]" sideOffset={6}>
        <Command>
          <CommandInput placeholder="Search fonts..." />
          <CommandList className="max-h-[60vh]">
            <CommandEmpty>No fonts found.</CommandEmpty>
            {CATEGORY_ORDER.map(cat => {
              const items = groups[cat];
              if (!items || items.length === 0) return null;
              return (
                <CommandGroup key={cat} heading={CATEGORY_LABEL[cat]}>
                  {items.map(({ ref, preview }) => (
                    <FontPickerItem
                      key={`${ref.source}:${ref.family}`}
                      fontRef={ref}
                      preview={preview}
                      selected={ref.family === value.family}
                      onSelect={() => {
                        ensureLoaded(ref);
                        onChange(ref);
                        setOpen(false);
                      }}
                    />
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function FontPickerItem({
  fontRef,
  selected,
  onSelect,
}: {
  fontRef: FontRef;
  preview: string;
  selected: boolean;
  onSelect: () => void;
}) {
  // Lazy-load so the preview actually renders in its family.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { ensureLoaded(fontRef); }, [fontRef.family, fontRef.source]);

  const fontFamily = `"${fontRef.family}", ${fontRef.fallback}`;

  return (
    <CommandItem
      value={fontRef.family}
      onSelect={onSelect}
      className={`ts-fontpicker-item${selected ? ' is-selected' : ''}`}
    >
      <span className="ts-fontpicker-item-aa" style={{ fontFamily }} aria-hidden>
        Aa
      </span>
      <span className="ts-fontpicker-item-name" style={{ fontFamily }}>
        {fontRef.family}
      </span>
      {selected && <Check size={14} className="ts-fontpicker-item-check" />}
    </CommandItem>
  );
}
