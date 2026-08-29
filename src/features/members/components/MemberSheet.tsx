// ============================================================================
// One person's access (docs/access-architecture/10 §4).
//
// Two rules this screen exists to keep:
//
//  • Every write that TAKES SOMETHING AWAY confirms with the delta first. Switching a
//    member from All brands to Selected silently drops twenty-nine of them otherwise, and
//    the audit log records what the user was never shown.
//  • Role and mode are written TOGETHER, in one RPC. The CHECK constraint is evaluated per
//    statement, so a partial write is either refused or leaves an incoherent row.
//
// A centered DsModal, not a slide-in sheet: DsModal is `position: fixed` and renders in
// place, so a transform on any ancestor would re-anchor it (the hazard CLAUDE.md records
// for `.bcm-slot`).
// ============================================================================
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DsButton, DsCheckbox, DsConfirmDialog, DsInput, DsModal, DsSelect, DsSegmented } from '@/shared/ds';
import {
  BRAND_ROLE_LABEL, BRAND_ROLES, WORKSPACE_ROLE_DESCRIPTION, WORKSPACE_ROLE_LABEL,
  type BrandRole, type WorkspaceRole,
} from '@/shared/access';
import {
  grantBrandAccess, MembersError, revokeBrandAccess, setMemberRole,
  type Member,
} from '../data/membersApi';
import { PersonAvatar } from './PersonAvatar';

export type SheetBrand = { id: string; name: string };

export function MemberSheet({
  member,
  brands,
  workspaceId,
  canManage,
  isSelf,
  onClose,
  onSaved,
}: {
  member: Member | null;
  brands: SheetBrand[];
  workspaceId: string;
  canManage: boolean;
  isSelf: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [role, setRole] = useState<WorkspaceRole>('member');
  const [mode, setMode] = useState<'all' | 'selected'>('selected');
  const [defaultRole, setDefaultRole] = useState<BrandRole>('editor');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [perBrandRole, setPerBrandRole] = useState<Record<string, BrandRole>>({});
  const [canExport, setCanExport] = useState(true);
  const [canAi, setCanAi] = useState(true);
  const [canBilling, setCanBilling] = useState(false);
  const [cap, setCap] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!member) return;
    setRole(member.role);
    setMode(member.mode);
    setDefaultRole(member.defaultBrandRole ?? 'editor');
    setSelected(new Set(member.grants.map((g) => g.brandId)));
    setPerBrandRole(Object.fromEntries(member.grants.map((g) => [g.brandId, g.role])));
    const deny = new Set(member.overrides?.deny ?? []);
    const grant = new Set(member.overrides?.grant ?? []);
    setCanExport(!deny.has('designs.export'));
    setCanAi(!deny.has('ai.generate'));
    setCanBilling(grant.has('workspace.billing.view'));
    setCap(member.creditsMonthlyCap != null ? String(member.creditsMonthlyCap) : '');
  }, [member]);

  /** What this save takes away, in the words the person losing it would use. */
  const losses = useMemo(() => {
    if (!member) return [];
    const out: string[] = [];
    const before = member.mode === 'all' ? brands.map((b) => b.id) : member.grants.map((g) => g.brandId);
    const after = mode === 'all' ? brands.map((b) => b.id) : [...selected];
    const dropped = before.filter((id) => !after.includes(id));
    if (dropped.length) {
      out.push(`${member.name} will lose access to ${dropped.length} ${dropped.length === 1 ? 'brand' : 'brands'}.`);
    }
    if (!canAi && !(member.overrides?.deny ?? []).includes('ai.generate')) {
      out.push(`${member.name} will no longer be able to use AI generation.`);
    }
    if (!canExport && !(member.overrides?.deny ?? []).includes('designs.export')) {
      out.push(`${member.name} will no longer be able to download or export.`);
    }
    if (RANK[role] > RANK[member.role]) {
      out.push(`${member.name} will drop from ${WORKSPACE_ROLE_LABEL[member.role]} to ${WORKSPACE_ROLE_LABEL[role]}.`);
    }
    return out;
  }, [member, brands, mode, selected, canAi, canExport, role]);

  if (!member) return null;

  const apply = async () => {
    setBusy(true);
    try {
      const grant: string[] = [];
      const deny: string[] = [];
      if (canExport) grant.push('designs.export', 'brand.kit.export');
      else deny.push('designs.export', 'brand.kit.export');
      if (canAi) grant.push('ai.generate'); else deny.push('ai.generate');
      if (canBilling && role === 'member') grant.push('workspace.billing.view');

      await setMemberRole({
        workspaceId,
        userId: member.userId,
        role,
        mode: role === 'guest' ? 'selected' : mode,
        defaultBrandRole: role === 'admin' ? null : defaultRole,
        overrides: { grant, deny },
      });

      // Brand grants: add or change what is selected, revoke what is not.
      if (role !== 'admin') {
        const want = role === 'guest' || mode === 'selected' ? [...selected] : [];
        for (const id of want) {
          const wantRole = perBrandRole[id] ?? defaultRole;
          const existing = member.grants.find((g) => g.brandId === id);
          if (!existing || existing.role !== wantRole) {
            await grantBrandAccess({ brandId: id, userId: member.userId, role: wantRole, allowAi: canAi });
          }
        }
        for (const g of member.grants) {
          if (!want.includes(g.brandId)) await revokeBrandAccess(g.brandId, member.userId);
        }
      }

      toast.success(`${member.name}’s access updated.`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof MembersError ? err.message : 'Could not save that.');
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const save = () => {
    if (losses.length) setConfirm(losses.join(' '));
    else void apply();
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const readOnly = !canManage || member.role === 'owner';

  return (
    <>
      <DsModal
        open
        onClose={onClose}
        title={member.name}
        eyebrow={member.email}
        actions={
          readOnly ? (
            <DsButton tone="secondary" onClick={onClose}>Close</DsButton>
          ) : (
            <>
              <DsButton tone="tertiary" onClick={onClose}>Cancel</DsButton>
              <DsButton tone="primary" onClick={save} disabled={busy}>
                {busy ? 'Saving…' : 'Save access'}
              </DsButton>
            </>
          )
        }
      >
        <div className="mem-sheet">
          <div className="mem-sheet-head">
            <PersonAvatar name={member.name} url={member.avatarUrl} size={44} />
            <div>
              <p className="mem-sheet-name">{member.name}</p>
              <p className="mem-sheet-email">{member.email}</p>
            </div>
          </div>

          {member.role === 'owner' && (
            <p className="mem-field-hint">
              Owners can do everything, everywhere. To change this, transfer ownership first.
            </p>
          )}

          {member.role !== 'owner' && (
            <>
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
                {isSelf && (
                  <span className="mem-field-hint">
                    You can’t change your own role — ask another owner or admin.
                  </span>
                )}
              </label>

              {role !== 'admin' && (
                <div className="mem-field">
                  <span className="mem-field-label">Brand access</span>
                  {role === 'guest' ? (
                    <span className="mem-field-hint">Guests always have selected brands.</span>
                  ) : (
                    <DsSegmented
                      value={mode}
                      onChange={(v) => setMode(v as 'all' | 'selected')}
                      options={[
                        { value: 'selected', label: 'Selected brands' },
                        { value: 'all', label: 'All brands' },
                      ]}
                    />
                  )}

                  {role !== 'guest' && mode === 'all' ? (
                    <div className="mem-all-row">
                      as
                      <DsSelect
                        value={defaultRole}
                        onChange={(v) => setDefaultRole(v as BrandRole)}
                        options={BRAND_ROLES.map((r) => ({ value: r, label: BRAND_ROLE_LABEL[r] }))}
                      />
                      <span className="mem-field-hint">on every brand, including ones added later</span>
                    </div>
                  ) : (
                    <div className="mem-brand-list">
                      {brands.map((b) => (
                        <div key={b.id} className="mem-brand-row">
                          <DsCheckbox checked={selected.has(b.id)} onChange={() => toggle(b.id)} label={b.name} />
                          {selected.has(b.id) && (
                            <DsSelect
                              value={perBrandRole[b.id] ?? defaultRole}
                              onChange={(v) => setPerBrandRole((p) => ({ ...p, [b.id]: v as BrandRole }))}
                              options={BRAND_ROLES.map((r) => ({ value: r, label: BRAND_ROLE_LABEL[r] }))}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mem-field">
                <span className="mem-field-label">Access</span>
                <div className="mem-switches">
                  <DsCheckbox checked={canExport} onChange={setCanExport} label="Can download and export" />
                  <DsCheckbox checked={canAi} onChange={setCanAi} label="Can use AI generation" />
                  {role === 'member' && (
                    <DsCheckbox checked={canBilling} onChange={setCanBilling} label="Can see billing" />
                  )}
                </div>
              </div>

              <label className="mem-field">
                <span className="mem-field-label">
                  Monthly AI limit <span className="mem-optional">optional</span>
                </span>
                <DsInput
                  value={cap}
                  onChange={(e) => setCap(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="No limit"
                  inputMode="numeric"
                  aria-label="Monthly AI credit limit"
                />
                <span className="mem-field-hint">
                  Credits this person can spend each month. The workspace wallet is shared;
                  this bounds one person’s share of it.
                </span>
              </label>
            </>
          )}
        </div>
      </DsModal>

      <DsConfirmDialog
        open={Boolean(confirm)}
        onCancel={() => setConfirm(null)}
        onConfirm={apply}
        title="Save these changes?"
        confirmLabel="Save access"
        description={confirm ?? ''}
      />
    </>
  );
}

const RANK: Record<WorkspaceRole, number> = { owner: 0, admin: 1, member: 2, guest: 3 };
