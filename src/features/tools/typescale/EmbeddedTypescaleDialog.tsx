import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useBrandStore } from '@/shared/store/brandStore';
import { TypescaleEditor } from './components/TypescaleEditor';
import { useSeedTypescale } from './hooks/useSeedTypescale';

interface Props {
  brandId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmbeddedTypescaleDialog({ brandId, open, onOpenChange }: Props) {
  const brand = useBrandStore((s) =>
    s.list.find((b) => b.id === brandId) ??
    (s.current?.id === brandId ? s.current : undefined),
  );
  const seed = useSeedTypescale(brand ?? null);
  if (!brand) return null;
  const initial = brand.typescale ?? seed;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Typescale — {brand.name}</DialogTitle>
        </DialogHeader>
        <TypescaleEditor
          variant="compact"
          brandId={brand.id}
          initial={initial}
          onClose={() => onOpenChange(false)}
          showBrandSync
        />
      </DialogContent>
    </Dialog>
  );
}
