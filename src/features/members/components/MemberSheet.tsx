// ============================================================================
// One person's access (docs/access-architecture/10 §4).
//
// Two rules this screen exists to keep:
//
//  • Every write that TAKES SOMETHING AWAY confirms with the delta first. Switching a
//    member from All brands to Selected silently drops twenty-nine of them otherwise, and
//    the audit log records what the user was never shown.
//  • The per-brand EXCEPTION is on screen. "No AI, except on Client A" is the whole point
//    of the precedence rule (a per-brand grant beats a workspace-wide deny), and it was
//    the one thing this sheet could not show: the switch read OFF while the server said
//    ON for one brand, and any later save silently stripped the exception because the
//    brand grant was written with the WORKSPACE switch. An exception you cannot see is an
//    exception you take away by accident.
//  • Role and mode are written TOGETHER, in one RPC. The CHECK constraint is evaluated per
//    statement, so a partial write is either refused or leaves an incoherent row.
//
// A centered DsModal, not a slide-in sheet: DsModal is `position: fixed` and renders in
// place, so a transform on any ancestor would re-anchor it (the hazard CLAUDE.md records
// for `.bcm-slot`).
// ============================================================================
import { Fragment, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DsButton, DsCheckbox, DsConfirmDialog, DsInput, DsModal, DsSelect, DsSegmented } from '@/shared/ds';
import {
  allowAiFor, BRAND_ROLE_LABEL, BRAND_ROLES, brandExceptionsFrom, brandOverridesFor,
  defaultSwitchState, exceptionSwitches, overridesFromSwitches, sameExceptions,
  switchesFor, switchLosses, switchStateFrom,
  WORKSPACE_ROLE_DESCRIPTION, WORKSPACE_ROLE_LABEL,
  type BrandRole, type SwitchState, type WorkspaceRole,
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
  /** Every named switch, by id. The sheet does not know which ones exist. */
  const [switches, setSwitches] = useState<SwitchState>({});
  /** Per brand, which switches that brand grants back. */
  const [exceptions, setExceptions] = useState<Record<string, SwitchState>>({});
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
    setExceptions(Object.fromEntries(
      member.grants.map((g) => [g.brandId, brandExceptionsFrom(g.overrides)])));
    setSwitches(switchStateFrom(member.overrides, member.defaultBrandRole));
    setCap(member.creditsMonthlyCap != null ? String(member.creditsMonthlyCap) : '');
  }, [member]);

  /** Brand names, per switch id, keeping an exception after this save. */
  const keptExceptions = useMemo(() => {
    const ids = mode === 'all' && role !== 'guest' ? [] : [...selected];
    const out: Record<string, string[]> = {};
    for (const sw of exceptionSwitches(switches)) {
      out[sw.id] = ids
        .filter((id) => exceptions[id]?.[sw.id])
        .map((id) => brands.find((br) => br.id === id)?.name ?? id);
    }
    return out;
  }, [brands, mode, role, selected, switches, exceptions]);

  /** What this save takes away, in the words the person losing it would use. */
  const losses = useMemo(() => {
    if (!member) return [];
    const out: string[] = [];
    const before = member.mode === 'all' ? brands.map((br) => br.id) : member.grants.map((g) => g.brandId);
    const after = mode === 'all' ? brands.map((br) => br.id) : [...selected];
    const dropped = before.filter((id) => !after.includes(id));
    if (dropped.length) {
      out.push(`${member.name} will lose access to ${dropped.length} ${dropped.length === 1 ? 'brand' : 'brands'}.`);
    }

    // A brand still selected keeps its exception; one dropped from the list loses it too.
    const hadExceptions: Record<string, string[]> = {};
    for (const g of member.grants) {
      const had = brandExceptionsFrom(g.overrides);
      for (const key of Object.keys(had)) {
        if (!had[key]) continue;
        (hadExceptions[key] ??= []).push(brands.find((br) => br.id === g.brandId)?.name ?? g.brandId);
      }
    }
    out.push(...switchLosses({
      name: member.name,
      before: switchStateFrom(member.overrides, member.defaultBrandRole),
      after: switches,
      keptExceptions,
      hadExceptions,
    }));

    if (RANK[role] > RANK[member.role]) {
      out.push(`${member.name} will drop from ${WORKSPACE_ROLE_LABEL[member.role]} to ${WORKSPACE_ROLE_LABEL[role]}.`);
    }
    return out;
  }, [member, brands, mode, selected, switches, role, keptExceptions]);

  /** Which switches may be excepted on a brand right now, and where they already are. */
  const offered = exceptionSwitches(switches);

  if (!member) return null;

  const apply = async () => {
    setBusy(true);
    try {
      const overrides = overridesFromSwitches(switches, role);

      await setMemberRole({
        workspaceId,
        userId: member.userId,
        role,
        mode: role === 'guest' ? 'selected' : mode,
        defaultBrandRole: role === 'admin' ? null : defaultRole,
        overrides,
      });

      // Brand grants are separate calls with no transaction around them, so a failure
      // halfway leaves some of them applied. Collect the failures instead of throwing on
      // the first, then refresh either way and NAME what did not land — the old behaviour
      // showed pre-edit state over a partially-changed database. (Pass C, F4.)
      const failed: string[] = [];
      if (role !== 'admin') {
        const want = role === 'guest' || mode === 'selected' ? [...selected] : [];
        for (const id of want) {
          const wantRole = perBrandRole[id] ?? defaultRole;
          // The workspace switch decides the default; the row decides the exception. The
          // exception is written as an explicit GRANT — `allowAi` alone only suppresses the
          // deny the RPC would otherwise add, so it grants nothing.
          const want = exceptions[id] ?? {};
          const existing = member.grants.find((g) => g.brandId === id);
          const had = brandExceptionsFrom(existing?.overrides);
          if (!existing || existing.role !== wantRole || !sameExceptions(had, want)) {
            try {
              await grantBrandAccess({
                brandId: id,
                userId: member.userId,
                role: wantRole,
                overrides: brandOverridesFor(want),
                allowAi: allowAiFor(switches, want),
              });
            } catch {
              failed.push(brands.find((b) => b.id === id)?.name ?? id);
            }
          }
        }
        for (const g of member.grants) {
          if (!want.includes(g.brandId)) {
            try {
              await revokeBrandAccess(g.brandId, member.userId);
            } catch {
              failed.push(brands.find((b) => b.id === g.brandId)?.name ?? g.brandId);
            }
          }
        }
      }

      if (failed.length) {
        toast.error(`Saved, except for ${failed.join(', ')}. Reopen to see what applied.`);
      } else {
        toast.success(`${member.name}’s access updated.`);
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof MembersError ? err.message : 'Could not save that.');
      onSaved();   // the role write may have landed; never leave stale state on screen
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
                            <>
                              {offered.map((sw) => (
                                <DsCheckbox
                                  key={sw.id}
                                  checked={!!exceptions[b.id]?.[sw.id]}
                                  onChange={(v) => setExceptions((p) => ({
                                    ...p, [b.id]: { ...(p[b.id] ?? {}), [sw.id]: v },
                                  }))}
                                  label={sw.exceptionLabel ?? sw.label}
                                />
                              ))}
                              <DsSelect
                                value={perBrandRole[b.id] ?? defaultRole}
                                onChange={(v) => setPerBrandRole((p) => ({ ...p, [b.id]: v as BrandRole }))}
                                options={BRAND_ROLES.map((r) => ({ value: r, label: BRAND_ROLE_LABEL[r] }))}
                              />
                            </>
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
                  {switchesFor(role).map((sw) => {
                    const kept = keptExceptions[sw.id] ?? [];
                    return (
                      <Fragment key={sw.id}>
                        <DsCheckbox
                          checked={!!switches[sw.id]}
                          onChange={(v) => setSwitches((p) => ({ ...p, [sw.id]: v }))}
                          label={sw.label}
                        />
                        {kept.length > 0 && (
                          <span className="mem-field-hint">
                            Except on {kept.join(', ')} — tick “{sw.exceptionLabel ?? sw.label}”
                            on a brand to add another.
                          </span>
                        )}
                      </Fragment>
                    );
                  })}
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
