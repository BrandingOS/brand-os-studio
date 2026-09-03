import React, { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MANIFEST, cellsFor, type FxComponent, type AxisValues } from '@/shared/ds/figma.manifest';
import '@/shared/ds/tokens.css';
import '@/shared/ds/components.css';
import './harness.css';

/**
 * The capture harness — DEV only.
 *
 * Renders every cell the manifest declares, each tagged with `data-fx-*` so the
 * extractor can read SEMANTICS off the DOM without ever importing the manifest.
 * That one-directional channel is what lets the same extractor handle screens in
 * later cycles: a screen simply carries fewer attributes and its structure is
 * inferred instead of declared.
 *
 * Nothing here decides how anything LOOKS. Every value the pipeline uses is
 * measured from these rendered nodes.
 *
 *   /_dev/figma                     every component
 *   /_dev/figma?component=DsMenu    one component
 *   /_dev/figma?theme=dark          dark mode
 *
 * The extractor sets theme and direction itself before measuring; the query
 * params exist so a human can eyeball the same states the pipeline sees.
 */

function Cell({
  component, values, index,
}: { component: FxComponent; values: AxisValues; index: number }) {
  const variant = Object.keys(values)
    .sort()
    .map((k) => `${k}=${values[k]}`)
    .join(',');

  return (
    <div
      className="fx-cell"
      // The index addresses this cell uniquely so the extractor can resolve a
      // pseudo-target inside it via CDP without depending on document order.
      data-fx-index={index}
      data-fx-component={component.key}
      data-fx-sid={component.sid}
      data-fx-variant={variant}
      data-fx-pseudo={component.pseudo?.(values) ?? 'default'}
      data-fx-pseudo-target={component.pseudoTarget ?? ''}
    >
      {/* The subject sits alone in its cell so its measured box is its own. */}
      <div className="fx-subject" data-fx-subject="">
        {component.render(values)}
      </div>
    </div>
  );
}

export default function FigmaHarnessPage() {
  const [params] = useSearchParams();
  const only = params.get('component');
  const theme = params.get('theme') === 'dark' ? 'dark' : 'light';
  const direction = params.get('dir') === 'rtl' ? 'rtl' : 'ltr';

  const components = useMemo(
    () => (only ? MANIFEST.filter((c) => c.key === only) : [...MANIFEST]),
    [only],
  );

  // The extractor drives these too, but setting them here keeps the page
  // truthful when a human opens it with ?theme=dark.
  useEffect(() => {
    document.documentElement.setAttribute('dir', direction);
    return () => document.documentElement.removeAttribute('dir');
  }, [direction]);

  /**
   * Cells are numbered ACROSS the whole page, in render order, so a cell's
   * index is a stable address the extractor can use to reach inside it. Grouped
   * rendering below reads its slice rather than counting as it goes.
   */
  const groups = useMemo(() => {
    let next = 0;
    return components.map((component) => {
      const cells = cellsFor(component).map((values) => ({ values, index: next++ }));
      return { component, cells };
    });
  }, [components]);

  const total = groups.reduce((n, g) => n + g.cells.length, 0);

  return (
    <div className="fx-root" data-workspace data-theme={theme} data-fx-harness="">
      <header className="fx-head">
        <span className="fx-title">Figma capture harness</span>
        <span className="fx-meta">
          {components.length} component{components.length === 1 ? '' : 's'} · {total} cells ·{' '}
          {theme} · {direction}
        </span>
      </header>

      {groups.map(({ component, cells }) => (
        <section key={component.key} className="fx-group" data-fx-group={component.key}>
          <h2 className="fx-group-title">
            {component.key} <span className="fx-count">{cells.length}</span>
          </h2>
          <div className="fx-grid">
            {cells.map(({ values, index }) => (
              <Cell
                key={index}
                index={index}
                component={component}
                values={values}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
