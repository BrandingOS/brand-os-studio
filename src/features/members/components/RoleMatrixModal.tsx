// ============================================================================
// "What can each role do?"
//
// Nothing else in the product defines Editor versus Designer, so a person choosing
// between them is guessing. This is the matrix from
// docs/access-architecture/03 §2, rendered from the SAME catalog the resolver and the
// database read — so it cannot describe a permission model the app does not have.
// ============================================================================
import { DsModal, DsButton } from '@/shared/ds';
import {
  BRAND_ROLES, BRAND_ROLE_CAPABILITIES, BRAND_ROLE_DESCRIPTION, BRAND_ROLE_LABEL,
  NAMED_SWITCHES, WORKSPACE_ROLES, WORKSPACE_ROLE_CAPABILITIES, WORKSPACE_ROLE_DESCRIPTION, WORKSPACE_ROLE_LABEL,
} from '@/shared/access';

/** Plain-English names for the capabilities, in the order people think about them. */
const WORKSPACE_ROWS: [string, string][] = [
  ['members.invite', 'Invite people'],
  ['members.manage', 'Change what people can reach'],
  ['members.remove', 'Remove people'],
  ['brands.create', 'Create brands'],
  ['brands.delete', 'Delete an archived brand'],
  ['workspace.settings.edit', 'Change workspace settings'],
  ['workspace.billing.manage', 'Manage billing'],
  ['workspace.usage.view', 'See credit usage'],
  ['audit.view', 'See the security log'],
  ['workspace.transfer_ownership', 'Transfer ownership'],
  ['workspace.delete', 'Delete the workspace'],
];

const BRAND_ROWS: [string, string][] = [
  ['brand.view', 'Open the brand'],
  ['brand.setup.edit', 'Edit Setup — logos, colours, fonts'],
  ['brand.strategy.edit', 'Edit Brand Strategy'],
  ['brand.kit.generate', 'Generate and customise kit deliverables'],
  ['brand.kit.approve', 'Approve kit deliverables'],
  ['designs.create', 'Create designs'],
  ['designs.edit', 'Edit designs'],
  ['designs.delete', 'Delete other people’s designs'],
  ['designs.export', 'Download and export'],
  ['library.upload', 'Upload to the library'],
  ['library.delete', 'Delete from the library'],
  ['ai.generate', 'Generate with AI (spends credits)'],
  ['share.link', 'Share a design or guideline'],
  ['share.publish_public', 'Publish the brand publicly'],
  ['brand.settings.edit', 'Change brand settings'],
  ['brand.access.manage', 'Decide who can reach this brand'],
  ['brand.archive', 'Archive and restore'],
];

export function RoleMatrixModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <DsModal
      open={open}
      onClose={onClose}
      title="What can each role do?"
      actions={<DsButton tone="secondary" onClick={onClose}>Close</DsButton>}
    >
      <div className="mem-matrix">
        <section>
          <h3>In the workspace</h3>
          <p className="mem-field-hint">
            A workspace role decides what someone can do to the workspace itself — people,
            billing, brands as a set.
          </p>
          <dl className="mem-matrix-roles">
            {WORKSPACE_ROLES.map((r) => (
              <div key={r}>
                <dt>{WORKSPACE_ROLE_LABEL[r]}</dt>
                <dd>{WORKSPACE_ROLE_DESCRIPTION[r]}</dd>
              </div>
            ))}
          </dl>
          <Table roles={[...WORKSPACE_ROLES]} labels={WORKSPACE_ROLE_LABEL}
                 rows={WORKSPACE_ROWS} caps={WORKSPACE_ROLE_CAPABILITIES} />
        </section>

        <section>
          <h3>In a brand</h3>
          <p className="mem-field-hint">
            A brand role decides what someone can do inside one brand. Owners and admins are
            managers of every brand.
          </p>
          <dl className="mem-matrix-roles">
            {BRAND_ROLES.map((r) => (
              <div key={r}>
                <dt>{BRAND_ROLE_LABEL[r]}</dt>
                <dd>{BRAND_ROLE_DESCRIPTION[r]}</dd>
              </div>
            ))}
          </dl>
          <Table roles={[...BRAND_ROLES]} labels={BRAND_ROLE_LABEL}
                 rows={BRAND_ROWS} caps={BRAND_ROLE_CAPABILITIES} />
        </section>
      </div>
    </DsModal>
  );
}

function Table({
  roles, labels, rows, caps,
}: {
  roles: string[];
  labels: Record<string, string>;
  rows: [string, string][];
  caps: Record<string, readonly string[]>;
}) {
  return (
    <div className="mem-matrix-scroll">
      <table className="mem-matrix-table">
        <thead>
          <tr>
            <th scope="col">Can</th>
            {roles.map((r) => <th key={r} scope="col">{labels[r]}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(([cap, label]) => {
            // A row a named switch controls can be overridden per person, so say so here
            // rather than leaving the matrix looking like the last word. Read from
            // NAMED_SWITCHES, so a new switch marks its own rows.
            const sw = NAMED_SWITCHES.find((n) => n.capabilities.includes(cap));
            return (
            <tr key={cap}>
              <th scope="row">
                {label}
                {sw && (
                  <span className="mem-matrix-switch" title={`Can be turned on or off per person (“${sw.label}”)`}>
                    per person
                  </span>
                )}
              </th>
              {roles.map((r) => (
                <td key={r} aria-label={caps[r]?.includes(cap) ? 'yes' : 'no'}>
                  {caps[r]?.includes(cap) ? '●' : '–'}
                </td>
              ))}
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
