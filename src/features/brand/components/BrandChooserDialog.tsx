/**
 * BrandChooserDialog — "Create this where?" brand picker.
 *
 * Shown when a user clicks a template (or duplicates a design) from a
 * brand-agnostic surface. The user must choose a target: one of their
 * existing brands, a new brand, or "no brand" (standalone design).
 *
 * The caller passes a `onChoose` callback that receives the choice. This
 * component owns nothing — it's a pure picker.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBrandStore } from '@/shared/store/brandStore';
import { logoUrl, hasLogo } from '@/shared/brand/logoUrl';
import type { Brand } from '@/shared/types/brand';
import { BrandAvatar } from '@/shared/brand/BrandAvatar';
import {
  Search,
  PenTool,
  Plus,
  ArrowRight,
} from 'lucide-react';

export type BrandChoice =
  | { kind: 'brand'; brand: Brand }
  | { kind: 'standalone' }
  | { kind: 'new' };

interface BrandChooserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called once the user makes a choice. Callers typically navigate here. */
  onChoose: (choice: BrandChoice) => void;
  /** Dialog title — caller controls the wording for context. */
  title?: string;
  /** Sub-copy that explains why we're asking. */
  description?: string;
  /** Hide the "Start without a brand" option when assigning existing work. */
  allowStandalone?: boolean;
  /** Hide the "Create a new brand" option for flows that don't support it. */
  allowCreateNew?: boolean;
  /** Highlight (and pre-skip) this brand — used when duplicating *from* a brand. */
  excludeBrandId?: string;
}

export function BrandChooserDialog({
  open,
  onOpenChange,
  onChoose,
  title = 'Choose a brand',
  description = 'Pick the brand to create this in. You can also start without a brand and assign it later.',
  allowStandalone = true,
  allowCreateNew = true,
  excludeBrandId,
}: BrandChooserDialogProps) {
  const brands = useBrandStore((s) => s.list);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const list = excludeBrandId ? brands.filter((b) => b.id !== excludeBrandId) : brands;
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (b) => b.name.toLowerCase().includes(q) || b.tone?.toLowerCase().includes(q),
    );
  }, [brands, query, excludeBrandId]);

  const pick = (choice: BrandChoice) => {
    onOpenChange(false);
    onChoose(choice);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {brands.length > 4 && (
          <div className="px-6 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search brands…"
                className="pl-9 h-9"
              />
            </div>
          </div>
        )}

        <div className="max-h-80 overflow-y-auto px-3 pb-2">
          {brands.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                You don't have any brands yet.
              </p>
              {allowCreateNew && (
                <Button onClick={() => pick({ kind: 'new' })} size="sm">
                  Create your first brand
                </Button>
              )}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No brands match "{query}".
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((b) => (
                <button
                  key={b.id}
                  onClick={() => pick({ kind: 'brand', brand: b })}
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted/60 transition-colors group"
                >
                  <BrandAvatar brand={b} size={40} radius={8} className="ring-1 ring-border/60" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{b.name}</p>
                    {b.tone && (
                      <p className="text-xs text-muted-foreground truncate">{b.tone}</p>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>

        {(allowStandalone || allowCreateNew) && (
          <div className="border-t border-border bg-muted/20 px-3 py-3 space-y-1">
            {allowStandalone && (
              <button
                onClick={() => pick({ kind: 'standalone' })}
                className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-background transition-colors group"
              >
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center ring-1 ring-border shrink-0">
                  <PenTool className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Start without a brand</p>
                  <p className="text-xs text-muted-foreground">
                    Create a standalone design. You can assign it to a brand later.
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
              </button>
            )}
            {allowCreateNew && brands.length > 0 && (
              <button
                onClick={() => pick({ kind: 'new' })}
                className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-background transition-colors group"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center ring-1 ring-primary/30 shrink-0">
                  <Plus className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Create a new brand</p>
                  <p className="text-xs text-muted-foreground">
                    We'll run AI onboarding, then drop you here with the new brand.
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
              </button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Default handler — navigates based on choice + a per-brand URL builder.
 * Caller supplies how to compute the destination from a brand slug.
 */
export function useBrandChoiceNavigator() {
  const navigate = useNavigate();
  return (
    choice: BrandChoice,
    resolve: {
      /** Route for a picked brand — gets the slug. */
      brand: (slug: string) => string;
      /** Route for standalone (no brand) creation. */
      standalone?: string;
      /** Route for "create new brand". */
      createNew?: string;
    },
  ) => {
    if (choice.kind === 'brand') {
      navigate(resolve.brand(choice.brand.slug));
      return;
    }
    if (choice.kind === 'standalone') {
      navigate(resolve.standalone ?? '/editor');
      return;
    }
    if (choice.kind === 'new') {
      // Use a `?then=` param so the onboarding flow can come back here later
      // once it lands the user on the new brand.
      navigate(resolve.createNew ?? '/onboarding-brand');
      return;
    }
    const _never: never = choice;
    void _never;
  };
}
