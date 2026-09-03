// ============================================================================
// "Who can reach this brand?" (docs/access-architecture/10 §5)
//
// The People screen answers per PERSON. An agency asks per CLIENT, and until now the only
// way to answer that was to open every teammate's sheet in turn and read off which brands
// each one listed. This is the same information, entered from the other side.
//
// The rule that shapes the whole screen: a row is editable HERE only when the person is on
// this brand BECAUSE of this brand. Someone who reaches it as an owner, or through an
// `all`-brands membership, is not this brand's business — changing them would change every
// other brand too, silently. Those rows say why they are here and send you to People.
//
// It renders inside the legacy Share page's tabs, but nothing in it is legacy: DS
// primitives, the shared `switches` table for every permission word, and one server RPC
// (`brand_people`) for the list, so this screen and RLS cannot hold different opinions
// about who can do what.
// ============================================================================
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { DsBadge, DsButton, DsCheckbox, DsConfirmDialog, DsEmptyState, DsInput, DsModal, DsSelect, DsSkeleton } from '@/shared/ds';
import {
  BRAND_ROLE_DESCRIPTION, BRAND_ROLE_LABEL, BRAND_ROLES,
  brandExceptionsFrom, brandOverridesFor, exceptionSwitches, switchStateFrom, useCan,
  WORKSPACE_ROLE_LABEL,
  type BrandRole, type SwitchState,
} from '@/shared/access';
import {
  grantBrandAccess, listBrandPeople, listMembers, MembersError, revokeBrandAccess,
  type BrandPerson, type Member,
} from '../data/membersApi';
import { PersonAvatar } from './PersonAvatar';
import '../members.css';

export function BrandPeoplePanel({
  brandId,
  brandName,
  workspaceId,
  currentUserId,
}: {
  brandId: string;
  brandName: string;
  workspaceId: string | null;
  currentUserId: string | null;
}) {
  const canView = useCan('brand.access.view', brandId);
  const canManage = useCan('brand.access.manage', brandId);

  const [people, setPeople] = useState<BrandPerson[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState<BrandPerson | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<BrandPerson | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (canView !== true) return;
    try {
      setPeople(await listBrandPeople(brandId));
      setFailed(false);
    } catch {
      setPeople([]);
      setFailed(true);
    }
  }, [brandId, canView]);

  useEffect(() => { void load(); }, [load]);

  // `unknown` is not `false`: answering "you cannot see this" while access is still
  // resolving is the flash this whole layer exists to avoid.
  if (canView === 'unknown' || (canView === true && people === null)) {
    return (
      <div className="mem-table" data-members aria-busy="true">
        {[0, 1, 2].map((i) => <DsSkeleton key={i} height={56} />)}
      </div>
    );
  }

  if (canView === false) {
    return (
      <DsEmptyState>
        Only people who manage {brandName} can see who has access to it.
      </DsEmptyState>
    );
  }

  if (failed) {
    return (
      <DsEmptyState actions={<DsButton tone="secondary" onClick={() => void load()}>Try again</DsButton>}>
        Something went wrong reading who can reach this brand.
      </DsEmptyState>
    );
  }

  const remove = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await revokeBrandAccess(brandId, removing.userId);
      toast.success(`${removing.name} no longer has access to ${brandName}.`);
      await load();
    } catch (err) {
      toast.error(err instanceof MembersError ? err.message : 'Could not remove that person.');
    } finally {
      setBusy(false);
      setRemoving(null);
    }
  };

  return (
    <div className="mem-table" data-members>
      <div className="bp-head">
        <div>
          <h2 className="bp-title">Who has access to {brandName}</h2>
          <p className="mem-field-hint">
            {people!.length} {people!.length === 1 ? 'person' : 'people'} can open this brand.
          </p>
        </div>
        {canManage === true && (
          <DsButton tone="primary" size="sm" onClick={() => setAdding(true)}>Add people</DsButton>
        )}
      </div>

      <ul className="mem-rows">
        {people!.map((p) => (
          <li key={p.userId} className="mem-row">
            <PersonRow
              person={p}
              isSelf={p.userId === currentUserId}
              canManage={canManage === true}
              onEdit={() => setEditing(p)}
              onRemove={() => setRemoving(p)}
            />
          </li>
        ))}
      </ul>

      {editing && (
        <BrandGrantModal
          person={editing}
          brandId={brandId}
          brandName={brandName}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); void load(); }}
        />
      )}

      {adding && workspaceId && (
        <AddPeopleModal
          brandId={brandId}
          brandName={brandName}
          workspaceId={workspaceId}
          already={new Set(people!.map((p) => p.userId))}
          onClose={() => setAdding(false)}
          onSaved={() => { setAdding(false); void load(); }}
        />
      )}

      <DsConfirmDialog
        open={!!removing}
        title="Remove access"
        description={
          removing
            ? `${removing.name} will no longer be able to open ${brandName}. Their access to other brands is unchanged.`
            : ''
        }
        confirmLabel={busy ? 'Removing…' : 'Remove access'}
        onConfirm={() => void remove()}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}

/** Why this person is here, in the words that say whether you can change it. */
function viaLabel(p: BrandPerson): string {
  if (p.via === 'role') return `${WORKSPACE_ROLE_LABEL[p.workspaceRole]} of the workspace`;
  if (p.via === 'workspace') return 'Has every brand';
  return 'On this brand';
}

function PersonRow({
  person, isSelf, canManage, onEdit, onRemove,
}: {
  person: BrandPerson;
  isSelf: boolean;
  canManage: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  // A direct grant's exception is only meaningful against the person's workspace switch —
  // "AI here" says nothing unless AI is off for them everywhere else.
  const notes = useMemo(() => {
    if (person.via !== 'direct') return [];
    const ws = switchStateFrom(person.workspaceOverrides, person.brandRole);
    const here = brandExceptionsFrom(person.overrides);
    return exceptionSwitches(ws)
      .filter((s) => here[s.id])
      .map((s) => s.summary.on ?? s.id);
  }, [person]);

  const editable = canManage && person.via === 'direct';

  return (
    <div className="bp-row">
      <PersonAvatar name={person.name} url={person.avatarUrl} />
      <div className="mem-row-identity">
        <div className="mem-row-name">
          {person.name}
          {isSelf && <span className="mem-row-you">you</span>}
          {person.workspaceRole === 'guest' && <DsBadge>Guest</DsBadge>}
        </div>
        <div className="mem-row-email">{person.email}</div>
      </div>
      <div className="bp-role">
        {person.brandRole ? BRAND_ROLE_LABEL[person.brandRole] : '—'}
        {notes.length > 0 && <span className="bp-note"> · {notes.join(' · ')} here</span>}
      </div>
      <div className="bp-via">{viaLabel(person)}</div>
      <div className="bp-actions">
        {editable ? (
          <>
            <DsButton tone="tertiary" size="sm" onClick={onEdit}>Change</DsButton>
            <DsButton tone="tertiary" size="sm" onClick={onRemove}>Remove</DsButton>
          </>
        ) : (
          // Not a disabled button: nothing is broken, this simply is not the place.
          <span className="mem-field-hint">Change in People</span>
        )}
      </div>
    </div>
  );
}

/** One person's access TO THIS BRAND. Nothing here can touch another brand. */
function BrandGrantModal({
  person, brandId, brandName, onClose, onSaved,
}: {
  person: BrandPerson;
  brandId: string;
  brandName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [role, setRole] = useState<BrandRole>(person.brandRole ?? 'editor');
  const [exceptions, setExceptions] = useState<SwitchState>(() => brandExceptionsFrom(person.overrides));
  const [busy, setBusy] = useState(false);

  const wsState = switchStateFrom(person.workspaceOverrides, role);
  const offered = exceptionSwitches(wsState);

  const save = async () => {
    setBusy(true);
    try {
      await grantBrandAccess({
        brandId,
        userId: person.userId,
        role,
        overrides: brandOverridesFor(exceptions),
        allowAi: !!wsState.ai || !!exceptions.ai,
      });
      toast.success(`${person.name}’s access to ${brandName} updated.`);
      onSaved();
    } catch (err) {
      toast.error(err instanceof MembersError ? err.message : 'Could not save that.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <DsModal
      open
      onClose={onClose}
      title={person.name}
      eyebrow={`On ${brandName}`}
      actions={
        <>
          <DsButton tone="tertiary" onClick={onClose}>Cancel</DsButton>
          <DsButton tone="primary" onClick={() => void save()} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </DsButton>
        </>
      }
    >
      <div className="mem-sheet">
        <label className="mem-field">
          <span className="mem-field-label">Role on this brand</span>
          <DsSelect
            value={role}
            onChange={(v) => setRole(v as BrandRole)}
            options={BRAND_ROLES.map((r) => ({ value: r, label: BRAND_ROLE_LABEL[r] }))}
          />
          <span className="mem-field-hint">{BRAND_ROLE_DESCRIPTION[role]}</span>
        </label>

        {offered.length > 0 && (
          <div className="mem-field">
            <span className="mem-field-label">Exceptions on this brand</span>
            <div className="mem-switches">
              {offered.map((sw) => (
                <DsCheckbox
                  key={sw.id}
                  checked={!!exceptions[sw.id]}
                  onChange={(v) => setExceptions((p) => ({ ...p, [sw.id]: v }))}
                  label={sw.exceptionLabel ?? sw.label}
                />
              ))}
            </div>
            <span className="mem-field-hint">
              {person.name} has this turned off across the workspace. Ticking it here turns it
              back on for {brandName} only.
            </span>
          </div>
        )}
      </div>
    </DsModal>
  );
}

/**
 * Add someone who is already in the workspace. Inviting a NEW person goes through People,
 * so a seat is counted in one place — two ways to consume a seat is two ways to miscount.
 */
function AddPeopleModal({
  brandId, brandName, workspaceId, already, onClose, onSaved,
}: {
  brandId: string;
  brandName: string;
  workspaceId: string;
  already: Set<string>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [role, setRole] = useState<BrandRole>('editor');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listMembers(workspaceId)
      .then((m) => setMembers(m.filter((x) => !already.has(x.userId) && x.status === 'active')))
      .catch(() => setMembers([]));
  }, [workspaceId, already]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (members ?? []).filter((m) => !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
  }, [members, query]);

  const add = async () => {
    setBusy(true);
    const failed: string[] = [];
    for (const userId of picked) {
      const m = members?.find((x) => x.userId === userId);
      try {
        await grantBrandAccess({
          brandId,
          userId,
          role,
          overrides: { grant: [] },
          // The person's own workspace switch decides; this screen adds no exception.
          allowAi: !!switchStateFrom(m?.overrides, role).ai,
        });
      } catch {
        failed.push(m?.name ?? userId);
      }
    }
    setBusy(false);
    if (failed.length) toast.error(`Added, except ${failed.join(', ')}.`);
    else toast.success(`Added ${picked.size} to ${brandName}.`);
    onSaved();
  };

  return (
    <DsModal
      open
      onClose={onClose}
      title={`Add people to ${brandName}`}
      actions={
        <>
          <DsButton tone="tertiary" onClick={onClose}>Cancel</DsButton>
          <DsButton tone="primary" onClick={() => void add()} disabled={busy || picked.size === 0}>
            {busy ? 'Adding…' : `Add ${picked.size || ''}`.trim()}
          </DsButton>
        </>
      }
    >
      <div className="mem-sheet">
        <label className="mem-field">
          <span className="mem-field-label">As</span>
          <DsSelect
            value={role}
            onChange={(v) => setRole(v as BrandRole)}
            options={BRAND_ROLES.map((r) => ({ value: r, label: BRAND_ROLE_LABEL[r] }))}
          />
          <span className="mem-field-hint">{BRAND_ROLE_DESCRIPTION[role]}</span>
        </label>

        <DsInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people…"
          aria-label="Search people"
        />

        {members === null ? (
          <DsSkeleton height={120} />
        ) : shown.length === 0 ? (
          <p className="mem-field-hint">
            {members.length === 0
              ? 'Everyone in this workspace can already reach this brand. To bring someone new in, invite them from People.'
              : 'Nobody matches that.'}
          </p>
        ) : (
          <div className="mem-brand-list">
            {shown.map((m) => (
              <div key={m.userId} className="mem-brand-row">
                <DsCheckbox
                  checked={picked.has(m.userId)}
                  onChange={() => setPicked((prev) => {
                    const next = new Set(prev);
                    next.has(m.userId) ? next.delete(m.userId) : next.add(m.userId);
                    return next;
                  })}
                  label={m.name}
                />
                <span className="mem-field-hint">{m.email}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </DsModal>
  );
}
