// TemplatesPanel — placeholder UI for picking a template.
//
// Phase 5a renders the surface only; Phase 4 wires the templates
// registry (per `templates.spec.md`) and an "Apply template" flow
// that hands the parsed BrandOSDocument to `adapter.loadDocument`.

export function TemplatesPanel() {
  return (
    <>
      <div className="panel-top">
        <div className="panel-heading">
          <span className="panel-heading-eyebrow">Browse</span>
          <h1 className="panel-heading-title">Templates</h1>
        </div>
      </div>
      <div className="panel-list">
        <p
          className="px-2 py-3 text-[11px]"
          style={{ color: 'var(--text-muted)' }}
        >
          The templates registry lands in Phase 4. Picking a template will load
          it into the canvas via the adapter.
        </p>
      </div>
    </>
  );
}
