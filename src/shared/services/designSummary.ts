/**
 * Pure helpers over `DesignSummary` (`@/core/types/services`).
 *
 * Lives here — not inside `features/brand-kit/` — on purpose. This module
 * knows nothing about Brand Kit; it only knows the `DesignSummary` shape
 * from `@/core`. Its consumers are editor-shell surfaces
 * (`TemplatesPanel.tsx`) and `design-alt` (`DesignRecentRow.tsx`), both of
 * which are peer FEATURES to `brand-kit`, not descendants of it — importing
 * `excludeTemplates` from `features/brand-kit/kit/` would have those
 * features reach INTO Brand Kit for something that isn't a Brand Kit
 * concept. `shared/services` is the neutral, downward-only home both the
 * editor and design-alt already import from for other design-storage
 * plumbing.
 */
import type { DesignSummary } from '@/core/types/services';

/**
 * Masters (Brand Kit's canonical per-deliverable Design, `isTemplate: true`)
 * share the same `IDesignStorage` as a user's own working designs — one
 * storage model, nothing to keep in sync. The consequence: any surface
 * built for a user's WORK — My Designs, Recent Designs, anywhere a
 * `listDesigns()` result becomes a list of THEIR files — must filter
 * masters out before rendering. A master belongs in Brand Kit, where the
 * user tunes it, not amongst someone's actual invoices.
 *
 * The rule that matters: a row with no `isTemplate` key is a WORKING
 * design, not a master. The flag postdates existing rows, so its absence
 * must never hide them — filter on `isTemplate !== true`, never on the
 * falsiness of some other field (a `!d.isTemplate` check would also be
 * correct here, but `!== true` is the version that keeps reading correctly
 * if the field ever widens past a plain boolean).
 *
 * Deletion-reachability finding (Task 11): as of this task, `IDesignStorage
 * .deleteDesign` has ZERO UI call sites anywhere in the app — not for
 * working designs, not for masters. No delete affordance exists at all
 * today, so there is nothing to guard yet. When a delete action is built,
 * it must either (a) operate on a list that has already been through
 * `excludeTemplates`, so a master is never in the candidate set, or (b) if
 * it operates on an unfiltered list (an admin tool, a raw storage
 * browser), explicitly refuse when `isTemplate === true` and require a
 * confirmation that names the template. Do not build that dialog before a
 * delete action exists to attach it to.
 */
export function excludeTemplates(designs: DesignSummary[]): DesignSummary[] {
  return designs.filter((d) => d.isTemplate !== true);
}
