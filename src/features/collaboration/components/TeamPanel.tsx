// ============================================================================
// Classic's team panel.
//
// This used to be a members list seeded from `useState` with the current user, plus an
// invite form that validated the address, showed a success toast and wrote NOTHING. It
// looked like the product had teams for as long as nobody tried to use it.
//
// Real membership now lives in Settings → Members (Studio), backed by
// workspace_members / brand_access and the invitation RPCs. Classic is bug-fix only, and
// a panel that lies is a bug, so this points at the real thing rather than reimplementing
// it here.
// ============================================================================
import { Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DsButton } from '@/shared/ds';

export function TeamPanel({ brandName }: { brandId?: string; brandName?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-muted p-2">
          <Users className="h-5 w-5 text-muted-foreground" aria-hidden />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold">People</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Invite teammates, clients and freelancers, and choose which brands each of them
            can reach{brandName ? ` — including ${brandName}` : ''}.
          </p>
          <div className="mt-4">
            <Link to="/settings/members">
              <DsButton tone="secondary">
                Manage people <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              </DsButton>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeamPanel;
