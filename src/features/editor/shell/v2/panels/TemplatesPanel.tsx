// TemplatesPanel — placeholder UI for picking a template.
//
// Round 2 fix 6 — single heading, terse empty state. Phase 4 wires
// the templates registry and the Apply flow.

export function TemplatesPanel() {
  return (
    <>
      <div className="panel-top">
        <div className="panel-heading">
          <h1 className="panel-heading-title">Templates</h1>
        </div>
      </div>
      <div className="panel-list">
        <p
          className="px-2 py-2 text-[12px]"
          style={{ color: 'var(--text-muted)' }}
        >
          Coming in Phase 4.
        </p>
      </div>
    </>
  );
}
