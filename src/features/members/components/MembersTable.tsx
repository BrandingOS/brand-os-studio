// ============================================================================
// The people list (docs/access-architecture/10 §4).
//
// A row answers the two questions someone actually has — who is this, and what can they
// reach — in one line, not fourteen permission chips. Detail lives in the sheet.
//
// There is no DsTable and DsAssetRow is asset-specific, so this is a feature-local
// component (decision ladder rung F). It uses DS primitives throughout and keeps rows
// `overflow: visible` because DsSelect/DsMenu render in place, not in a portal.
// ============================================================================
import { useMemo, useState } from 'react';

import { DsInput, DsBadge, DsSelect, DsSkeleton } from '@/shared/ds';
import { RowMenu } from './RowMenu';
import { BRAND_ROLE_LABEL, WORKSPACE_ROLE_LABEL, type WorkspaceRole } from '@/shared/access';
import type { Member } from '../data/membersApi';
import { PersonAvatar } from './PersonAvatar';

export type MemberRowAction = 'change-access' | 'remove' | 'transfer-ownership';

export function MembersTable({
  members,
  loading,
  canManage,
  currentUserId,
  onOpen,
  onAction,
}: {
  members: Member[];
  loading: boolean;
  canManage: boolean;
  currentUserId: string | null;
  onOpen: (member: Member) => void;
  onAction: (action: MemberRowAction, member: Member) => void;
}) {
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | WorkspaceRole>('all');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members
      .filter((m) => (roleFilter === 'all' ? true : m.role === roleFilter))
      .filter((m) => !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
      .sort((a, b) => ORDER[a.role] - ORDER[b.role] || a.name.localeCompare(b.name));
  }, [members, query, roleFilter]);

  if (loading) {
    return (
      <div className="mem-table" aria-busy="true">
        {[0, 1, 2].map((i) => <DsSkeleton key={i} height={56} />)}
      </div>
    );
  }

  return (
    <div className="mem-table">
      {/* 8 people needs no search; 25 seats + 50 guest seats does, from the day it ships */}
      <div className="mem-table-filters">
        <DsInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people…"
          aria-label="Search people"
          pill
        />
        <DsSelect
          value={roleFilter}
          onChange={(v) => setRoleFilter(v as 'all' | WorkspaceRole)}
          aria-label="Filter by role"
          options={[
            { value: 'all', label: 'All roles' },
            { value: 'owner', label: 'Owners' },
            { value: 'admin', label: 'Admins' },
            { value: 'member', label: 'Members' },
            { value: 'guest', label: 'Guests' },
          ]}
        />
      </div>

      <ul className="mem-rows">
        {rows.map((m) => (
          <li key={m.userId} className="mem-row">
            <button type="button" className="mem-row-main" onClick={() => onOpen(m)}>
              <PersonAvatar name={m.name} url={m.avatarUrl} />
              <span className="mem-row-identity">
                <span className="mem-row-name">
                  {m.name}
                  {m.userId === currentUserId && <span className="mem-row-you">you</span>}
                  {m.role === 'guest' && <DsBadge tone="neutral">Guest</DsBadge>}
                  {m.status === 'suspended' && <DsBadge tone="warning">Suspended</DsBadge>}
                </span>
                <span className="mem-row-email">{m.email}</span>
              </span>
              <span className="mem-row-access">{accessSummary(m)}</span>
            </button>

            {canManage && (
              <RowMenu
                label={`Actions for ${m.name}`}
                items={[
                  { label: 'Change access', onSelect: () => onAction('change-access', m) },
                  ...(m.role !== 'owner'
                    ? [{ label: 'Transfer ownership…', onSelect: () => onAction('transfer-ownership', m) }]
                    : []),
                  { label: 'Remove from workspace', danger: true, onSelect: () => onAction('remove', m) },
                ]}
              />
            )}
          </li>
        ))}
      </ul>

      {rows.length === 0 && (
        <p className="mem-empty">
          {query || roleFilter !== 'all' ? 'Nobody matches that.' : 'Nobody here yet.'}
        </p>
      )}
    </div>
  );
}

const ORDER: Record<WorkspaceRole, number> = { owner: 0, admin: 1, member: 2, guest: 3 };

/**
 * "Editor · All brands" or "Designer · 2 brands", plus only the switches that DIFFER from
 * the role's default — a row that lists every capability is a row nobody reads.
 */
function accessSummary(m: Member): string {
  if (m.role === 'owner' || m.role === 'admin') return WORKSPACE_ROLE_LABEL[m.role];

  const role = m.defaultBrandRole ? BRAND_ROLE_LABEL[m.defaultBrandRole] : 'No brand role';
  const scope = m.mode === 'all'
    ? 'All brands'
    : `${m.grants.length} ${m.grants.length === 1 ? 'brand' : 'brands'}`;

  const notes: string[] = [];
  const deny = new Set(m.overrides?.deny ?? []);
  const grant = new Set(m.overrides?.grant ?? []);
  if (deny.has('ai.generate')) notes.push('no AI');
  if (deny.has('designs.export')) notes.push('no exports');
  if (grant.has('designs.export') && m.defaultBrandRole === 'viewer') notes.push('exports');
  if (grant.has('workspace.billing.view')) notes.push('billing');

  return [role, scope, ...notes].join(' · ');
}
