// Phase 7.2 — Multiplayer presence avatar stack for the editor topbar.
//
// Subscribes to the brand-scoped Supabase Realtime presence channel
// keyed by `design:${designId}` and renders an overlapping avatar
// stack of OTHER users currently viewing this design. The current
// user is filtered out by useBrandPresence already.
//
// Hidden when there's no presence (silent zero-state — keeps the
// topbar clean for solo work). Clicking the stack does nothing in
// 7.2 (read-only); a future "follow user" affordance can surface
// off the same data.

import { useBrandPresence } from '@/shared/hooks/useBrandPresence';

interface EditorPresenceAvatarsProps {
  brandId: string;
  designId: string;
  /** Cap how many avatars render before collapsing to "+N". */
  max?: number;
}

export function EditorPresenceAvatars({
  brandId,
  designId,
  max = 4,
}: EditorPresenceAvatarsProps) {
  const users = useBrandPresence(brandId, `design:${designId}`);
  if (users.length === 0) return null;

  const visible = users.slice(0, max);
  const overflow = users.length - visible.length;

  return (
    <div
      data-editor-presence
      data-presence-count={users.length}
      className="flex items-center -space-x-1.5 mr-1"
      aria-label={`${users.length} other ${users.length === 1 ? 'person is' : 'people are'} viewing this design`}
    >
      {visible.map((u) => (
        <Avatar key={u.userId} name={u.name} avatarUrl={u.avatarUrl} />
      ))}
      {overflow > 0 ? (
        <span
          className="inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium text-muted-foreground"
          title={`+${overflow} more`}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  const initials = (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('') || '?';

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        title={name}
        className="h-6 w-6 rounded-full border-2 border-background object-cover"
      />
    );
  }
  return (
    <span
      title={name}
      className="inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-primary text-[10px] font-semibold text-primary-foreground"
    >
      {initials}
    </span>
  );
}
