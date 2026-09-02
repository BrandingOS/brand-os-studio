// ============================================================================
// Invite someone (docs/access-architecture/10 §4).
//
// The simple case is meant to take seconds; the granular case is possible without a
// second screen. Three decisions that are deliberate:
//
//  • SELECTED BRANDS is the default (owner decision #1). An invitation that quietly
//    reaches thirty client brands is the wrong thing to do by accident.
//  • The named switches are on EVERY plan. They exist for the three cases the brief
//    actually names — a client who may download, a designer who may not spend credits, a
//    bookkeeper who sees billing — and a permission behind a paywall is backwards.
//  • The seat count is checked BEFORE the form opens and again by the server, because a
//    pending invitation holds a seat.
// ============================================================================
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  DsButton, DsInput, DsModal, DsSelect, DsSegmented, DsCheckbox, DsTextArea, DsBadge,
} from '@/shared/ds';
import {
  BRAND_ROLE_LABEL, BRAND_ROLES, defaultSwitchState, overridesFromSwitches, switchesFor,
  WORKSPACE_ROLE_DESCRIPTION, WORKSPACE_ROLE_LABEL,
  type BrandRole, type SwitchState, type WorkspaceRole,
} from '@/shared/access';
import { createInvitation, MembersError } from '../data/membersApi';

export type InviteBrand = { id: string; name: string };

export function InviteMemberModal({
  open,
  onClose,
  workspaceId,
  brands,
  onInvited,
}: {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  brands: InviteBrand[];
  onInvited: (result: { email: string; link: string }) => void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('member');
  const [mode, setMode] = useState<'all' | 'selected'>('selected');
  const [brandRole, setBrandRole] = useState<BrandRole>('editor');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [perBrandRole, setPerBrandRole] = useState<Record<string, BrandRole>>({});
  const [search, setSearch] = useState('');
  /** Every named switch, by id — the same table the sheet and the row read. */
  const [switches, setSwitches] = useState<SwitchState>(() => defaultSwitchState('member', 'editor'));
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  // A guest is scoped by definition: selected brands only, no AI unless someone says so.
  useEffect(() => {
    if (role === 'guest') {
      setMode('selected');
      setBrandRole('viewer');
      // A guest starts with nothing extra; the table says what that means.
      setSwitches(defaultSwitchState('guest', 'viewer'));
    }
    if (role === 'admin') setMode('all');
  }, [role]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? brands.filter((b) => b.name.toLowerCase().includes(q)) : brands;
  }, [brands, search]);

  const reset = () => {
    setEmail(''); setRole('member'); setMode('selected'); setBrandRole('editor');
    setSelected(new Set()); setPerBrandRole({}); setSearch('');
    setSwitches(defaultSwitchState('member', 'editor')); setMessage('');
  };

  const submit = async () => {
    if (!email.trim()) return;
    setBusy(true);
    try {
      // The switches are stored as capability overrides — the same rows the generic
      // editor would write — so the backend stays purely capability-based.
      const overrides = overridesFromSwitches(switches, role);

      const { token } = await createInvitation({
        workspaceId,
        email: email.trim(),
        role,
        mode,
        defaultBrandRole: brandRole,
        brandGrants: mode === 'selected'
          ? [...selected].map((id) => ({ brandId: id, role: perBrandRole[id] ?? brandRole }))
          : [],
        overrides,
        message: message.trim() || undefined,
      });
      const link = `${window.location.origin}/invite/${token}`;
      onInvited({ email: email.trim(), link });
      reset();
      onClose();
    } catch (err) {
      toast.error(err instanceof MembersError ? err.message : 'Could not send that invitation.');
    } finally {
      setBusy(false);
    }
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const ready = email.includes('@') && (mode === 'all' || selected.size > 0);

  return (
    <DsModal
      open={open}
      onClose={onClose}
      title="Invite someone"
      actions={
        <>
          <DsButton tone="tertiary" onClick={onClose}>Cancel</DsButton>
          <DsButton tone="primary" onClick={submit} disabled={!ready || busy}>
            {busy ? 'Sending…' : 'Send invite'}
          </DsButton>
        </>
      }
    >
      <div className="mem-invite">
        <label className="mem-field">
          <span className="mem-field-label">Email</span>
          <DsInput
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            autoFocus
            type="email"
          />
        </label>

        <label className="mem-field">
          <span className="mem-field-label">Role</span>
          <DsSelect
            value={role}
            onChange={(v) => setRole(v as WorkspaceRole)}
            options={[
              { value: 'admin', label: WORKSPACE_ROLE_LABEL.admin },
              { value: 'member', label: WORKSPACE_ROLE_LABEL.member },
              { value: 'guest', label: WORKSPACE_ROLE_LABEL.guest },
            ]}
          />
          <span className="mem-field-hint">{WORKSPACE_ROLE_DESCRIPTION[role]}</span>
        </label>

        {role !== 'admin' && (
          <div className="mem-field">
            <span className="mem-field-label">Brand access</span>
            <DsSegmented
              value={mode}
              onChange={(v) => setMode(v as 'all' | 'selected')}
              options={
                role === 'guest'
                  // A guest is scoped by definition, so "All brands" is not offered at all
                  // rather than offered and refused.
                  ? [{ value: 'selected', label: 'Selected brands' }]
                  : [
                      { value: 'selected', label: 'Selected brands' },
                      { value: 'all', label: 'All brands' },
                    ]
              }
            />

            {mode === 'all' ? (
              <div className="mem-all-row">
                as
                <DsSelect
                  value={brandRole}
                  onChange={(v) => setBrandRole(v as BrandRole)}
                  options={BRAND_ROLES.map((r) => ({ value: r, label: BRAND_ROLE_LABEL[r] }))}
                />
                {/* load-bearing: people read "All brands" as a snapshot of today */}
                <span className="mem-field-hint">on every brand, including ones added later</span>
              </div>
            ) : (
              <div className="mem-brand-picker">
                <DsInput
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search brands…"
                  aria-label="Search brands"
                />
                <div className="mem-brand-list" role="group" aria-label="Brands">
                  {filtered.map((b) => (
                    <div key={b.id} className="mem-brand-row">
                      <DsCheckbox
                        checked={selected.has(b.id)}
                        onChange={() => toggle(b.id)}
                        label={b.name}
                      />
                      {selected.has(b.id) && (
                        <DsSelect
                          value={perBrandRole[b.id] ?? brandRole}
                          onChange={(v) => setPerBrandRole((p) => ({ ...p, [b.id]: v as BrandRole }))}
                          options={BRAND_ROLES.map((r) => ({ value: r, label: BRAND_ROLE_LABEL[r] }))}
                        />
                      )}
                    </div>
                  ))}
                  {filtered.length === 0 && <p className="mem-empty">No brands match that.</p>}
                </div>
                {selected.size > 1 && (
                  <div className="mem-all-row">
                    apply
                    <DsSelect
                      value={brandRole}
                      onChange={(v) => {
                        const r = v as BrandRole;
                        setBrandRole(r);
                        setPerBrandRole((p) => {
                          const next = { ...p };
                          for (const id of selected) next[id] = r;
                          return next;
                        });
                      }}
                      options={BRAND_ROLES.map((r) => ({ value: r, label: BRAND_ROLE_LABEL[r] }))}
                    />
                    to all {selected.size} selected
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mem-field">
          <span className="mem-field-label">Access</span>
          <div className="mem-switches">
            {switchesFor(role).map((sw) => (
              <DsCheckbox
                key={sw.id}
                checked={!!switches[sw.id]}
                onChange={(v) => setSwitches((p) => ({ ...p, [sw.id]: v }))}
                label={role === 'guest' && sw.scope === 'brand'
                  ? `${sw.label} on these brands`
                  : sw.label}
              />
            ))}
          </div>
          {role === 'guest' && switches.ai && (
            <span className="mem-field-hint">
              <DsBadge tone="warning">Spends credits</DsBadge> This guest will use your workspace’s AI credits.
            </span>
          )}
        </div>

        <label className="mem-field">
          <span className="mem-field-label">Message <span className="mem-optional">optional</span></span>
          <DsTextArea value={message} onChange={(e) => setMessage(e.target.value)} rows={2}
            placeholder="Anything they should know" />
        </label>
      </div>
    </DsModal>
  );
}
