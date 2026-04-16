import { useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBrandBoardStore, type BrandBoardDraft } from '../store/useBrandBoardStore';

interface SavedConcept {
  id: number;
  label: string;
  draft: BrandBoardDraft;
}

const MAX_CONCEPTS = 5;

export function ConceptSwitcher() {
  const draft = useBrandBoardStore((s) => s.draft);
  const setDraft = useBrandBoardStore((s) => s.setDraft);
  const setColors = useBrandBoardStore((s) => s.setColors);
  const setTypography = useBrandBoardStore((s) => s.setTypography);
  const setUIStyle = useBrandBoardStore((s) => s.setUIStyle);
  const setBrandName = useBrandBoardStore((s) => s.setBrandName);

  const [concepts, setConcepts] = useState<SavedConcept[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const loadConcept = (concept: SavedConcept) => {
    const d = concept.draft;
    setBrandName(d.brandName);
    setColors(d.colors);
    setTypography(d.typography);
    setUIStyle(d.uiStyle);
    setActiveId(concept.id);
    setOpen(false);
  };

  const saveConcept = () => {
    if (concepts.length >= MAX_CONCEPTS) return;
    const id = Date.now();
    const newConcept: SavedConcept = {
      id,
      label: `Concept ${concepts.length + 1}`,
      draft: JSON.parse(JSON.stringify(draft)),
    };
    setConcepts((prev) => [...prev, newConcept]);
    setActiveId(id);
    setOpen(false);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="text-xs gap-1.5"
        onClick={() => setOpen(!open)}
      >
        {activeId
          ? concepts.find((c) => c.id === activeId)?.label ?? 'Concepts'
          : 'Concepts'}
        <span className="text-muted-foreground">
          ({concepts.length}/{MAX_CONCEPTS})
        </span>
      </Button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-popover border border-border rounded-lg shadow-lg z-50 py-1">
          {concepts.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3 px-2">
              No saved concepts yet
            </p>
          )}
          {concepts.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`w-full text-left text-sm px-3 py-2 hover:bg-muted/60 transition-colors flex items-center gap-2 ${
                c.id === activeId ? 'bg-primary/5 text-primary font-medium' : ''
              }`}
              onClick={() => loadConcept(c)}
            >
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: c.draft.colors.primary }}
              />
              {c.label}
            </button>
          ))}
          {concepts.length < MAX_CONCEPTS && (
            <>
              {concepts.length > 0 && (
                <div className="border-t border-border/60 my-1" />
              )}
              <button
                type="button"
                className="w-full text-left text-sm px-3 py-2 hover:bg-muted/60 transition-colors flex items-center gap-2 text-muted-foreground"
                onClick={saveConcept}
              >
                <Save className="h-3.5 w-3.5" />
                Save current as concept
              </button>
            </>
          )}
        </div>
      )}

      {/* Click-away */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}
