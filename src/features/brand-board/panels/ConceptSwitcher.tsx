import { useState } from 'react';
import { Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBrandBoardStore } from '../store/useBrandBoardStore';

const MAX_CONCEPTS = 5;

export function ConceptSwitcher() {
  const concepts = useBrandBoardStore((s) => s.concepts);
  const activeConcept = useBrandBoardStore((s) => s.activeConcept);
  const saveConcept = useBrandBoardStore((s) => s.saveConcept);
  const loadConcept = useBrandBoardStore((s) => s.loadConcept);
  const deleteConcept = useBrandBoardStore((s) => s.deleteConcept);

  const [open, setOpen] = useState(false);

  const handleSave = () => {
    if (concepts.length >= MAX_CONCEPTS) return;
    saveConcept();
    setOpen(false);
  };

  const handleLoad = (index: number) => {
    loadConcept(index);
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
        {activeConcept >= 0 && activeConcept < concepts.length
          ? concepts[activeConcept].name
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
          {concepts.map((c, i) => (
            <button
              key={i}
              type="button"
              className={`w-full text-left text-sm px-3 py-2 hover:bg-muted/60 transition-colors flex items-center gap-2 ${
                i === activeConcept ? 'bg-primary/5 text-primary font-medium' : ''
              }`}
              onClick={() => handleLoad(i)}
            >
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: c.draft.colors.primary }}
              />
              <span className="flex-1 truncate">{c.name}</span>
              <span
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConcept(i);
                }}
                className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </span>
            </button>
          ))}
          {concepts.length > 0 && <div className="border-t border-border/60 my-1" />}
          {concepts.length < MAX_CONCEPTS ? (
            <button
              type="button"
              className="w-full text-left text-sm px-3 py-2 hover:bg-muted/60 transition-colors flex items-center gap-2 text-muted-foreground"
              onClick={handleSave}
            >
              <Save className="h-3.5 w-3.5" />
              Save current as concept
            </button>
          ) : (
            <div
              className="w-full text-left text-xs px-3 py-2 flex items-center gap-2 text-muted-foreground/70"
              title="Delete a concept to free a slot."
            >
              <Save className="h-3.5 w-3.5 opacity-50" />
              <span>Max {MAX_CONCEPTS} concepts reached</span>
            </div>
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
