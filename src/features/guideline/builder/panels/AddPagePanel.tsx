/**
 * The page library.
 *
 * Grouped by category — Logo, Colours, Typography, Imagery, Motion, Voice —
 * because that is the vocabulary a brand book uses. Rendered as
 * `.panel-group-label` + `.panel-item` rows, which is exactly the design
 * editor's Insert panel: same group heading, same thumb · name · sub row.
 *
 * Where multiple layouts per category will land: a category with more than one
 * entry already renders as a list, so a variant picker is a second level
 * inside a row rather than a new surface. Nothing about that is built.
 */
import {
  Camera, Film, LayoutTemplate, MessageCircle, Palette, PenTool, Sparkles, Type,
} from 'lucide-react';
import { PAGE_CATEGORIES, pageTypesByCategory, type PageCategoryId } from '../../model/pageLibrary';

const CATEGORY_ICON: Record<PageCategoryId, typeof PenTool> = {
  structure: LayoutTemplate,
  introduction: Sparkles,
  logo: PenTool,
  colors: Palette,
  typography: Type,
  imagery: Camera,
  motion: Film,
  voice: MessageCircle,
  applications: LayoutTemplate,
};

export function AddPagePanel({
  insertAfterLabel,
  onAdd,
}: {
  /** Where the page will land, in words — "the end", "page 12 · Colour ratio". */
  insertAfterLabel: string;
  onAdd: (typeId: string) => void;
}) {
  return (
    <nav className="panel-list" aria-label="Page library">
      <div className="gl-insert-target">After {insertAfterLabel}</div>
      {PAGE_CATEGORIES.map((category) => {
        const types = pageTypesByCategory(category.id);
        if (types.length === 0) return null;
        const Icon = CATEGORY_ICON[category.id];
        return (
          <div key={category.id}>
            <div className="panel-group-label">{category.name}</div>
            {types.map((type) => (
              <div key={type.id} className="panel-item">
                <button type="button" className="panel-item-body" onClick={() => onAdd(type.id)}>
                  <span className="panel-item-thumb">
                    <Icon size={16} strokeWidth={1.6} aria-hidden />
                  </span>
                  <span className="panel-item-meta">
                    <span className="panel-item-name">{type.name}</span>
                    <span className="panel-item-sub">{type.description}</span>
                  </span>
                </button>
              </div>
            ))}
          </div>
        );
      })}
    </nav>
  );
}
