/**
 * The page library.
 *
 * Grouped by category, which is the vocabulary a brand book actually uses —
 * Logo, Colours, Typography, Imagery, Motion, Voice. Each entry is one page
 * with one design; picking it adds that page, filled from the brand, and takes
 * the user to it.
 *
 * Where multiple layouts per category will land: a category with more than one
 * entry already renders as a list here, so a `variant` picker is a second level
 * inside the card rather than a new surface. Nothing about that is built.
 */
import { PAGE_CATEGORIES, pageTypesByCategory } from '../../model/pageLibrary';

export function AddPagePanel({
  insertAfterLabel,
  onAdd,
}: {
  /** What the insertion point is, in words — "the end", "page 12". */
  insertAfterLabel: string;
  onAdd: (typeId: string) => void;
}) {
  return (
    <div className="gl-panel-body">
      <p className="gl-panel-note">
        Adds after <strong>{insertAfterLabel}</strong>, filled in from this brand.
      </p>

      {PAGE_CATEGORIES.map((category) => {
        const types = pageTypesByCategory(category.id);
        if (types.length === 0) return null;
        return (
          <section key={category.id} className="gl-lib-group">
            <h3 className="gl-lib-title">{category.name}</h3>
            <p className="gl-lib-desc">{category.description}</p>
            <div className="gl-lib-items">
              {types.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  className="gl-lib-item"
                  onClick={() => onAdd(type.id)}
                >
                  <span className="gl-lib-item-name">{type.name}</span>
                  <span className="gl-lib-item-desc">{type.description}</span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
