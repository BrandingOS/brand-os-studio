/**
 * Approvals — per-brand review queue.
 *
 * Mounted at /b/:slug/approvals. Lists pending/approved/rejected items
 * with approve/reject actions.
 *
 * v5 PRD Phase 12.
 */
import * as React from 'react';
import { useParams } from 'react-router-dom';
import { BrandLayout } from '@/features/brand/components/BrandLayout';
import { useBrandStore } from '@/shared/store/brandStore';
import { PageHeader } from '@/shared/ui/PageHeader';
import { useApprovalsStore, type ApprovalItem, type ApprovalStatus } from './approvalsStore';
import { useSessionStore } from '@/shared/store/sessionStore';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  FileText,
  Layers,
  Image as ImageIcon,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const KIND_ICON = {
  asset: ImageIcon,
  template: Layers,
  block: FileText,
  guideline: BookOpen,
} as const;

export default function ApprovalsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { current, loadBySlug } = useBrandStore();
  const { list, approve, reject, seedSample } = useApprovalsStore();
  const user = useSessionStore((s) => s.user);
  const reviewer = user?.email || user?.user_metadata?.full_name || 'reviewer';
  const [filter, setFilter] = React.useState<ApprovalStatus | 'all'>('pending');
  const [active, setActive] = React.useState<ApprovalItem | null>(null);
  const [comment, setComment] = React.useState('');

  React.useEffect(() => {
    if (slug) loadBySlug(slug);
  }, [slug, loadBySlug]);

  const items = current ? list(current.id) : [];
  const filtered = filter === 'all' ? items : items.filter((i) => i.status === filter);
  const counts = {
    all: items.length,
    pending: items.filter((i) => i.status === 'pending').length,
    approved: items.filter((i) => i.status === 'approved').length,
    rejected: items.filter((i) => i.status === 'rejected').length,
  };

  if (!current) {
    return (
      <BrandLayout>
        <div className="p-8 text-sm text-muted-foreground">Loading…</div>
      </BrandLayout>
    );
  }

  const handleApprove = () => {
    if (!active) return;
    approve(active.id, reviewer, comment.trim() || undefined);
    toast.success('Approved');
    setActive(null);
    setComment('');
  };

  const handleReject = () => {
    if (!active) return;
    reject(active.id, reviewer, comment.trim() || undefined);
    toast.success('Rejected');
    setActive(null);
    setComment('');
  };

  return (
    <BrandLayout maxWidth="6xl">
      <PageHeader
        eyebrow="Approvals"
        title="Review queue"
        subtitle={`Manage approval requests for ${current.name}.`}
        actions={
          counts.all === 0 ? (
            <button
              type="button"
              onClick={() => seedSample(current.id)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <Sparkles className="h-3 w-3" />
              Seed sample queue
            </button>
          ) : null
        }
      />

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition',
              filter === s
                ? 'border-primary/60 bg-primary/10 text-foreground'
                : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground',
            )}
          >
            {s}
            <span className="rounded-full bg-background/60 px-1.5 py-px text-[10px] tabular-nums">{counts[s]}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/30 px-6 py-16 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
          <h3 className="mt-3 font-display text-xl font-semibold text-foreground">All caught up</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Nothing in the {filter} queue right now.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {filtered.map((item, i) => {
            const Icon = KIND_ICON[item.kind];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActive(item)}
                className={cn(
                  'flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-muted/30',
                  i !== filtered.length - 1 && 'border-b border-border',
                )}
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-background">
                  <Icon className="h-4 w-4 text-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-foreground">{item.title}</div>
                  <div className="mt-0.5 flex items-center gap-2 truncate text-[11px] text-muted-foreground">
                    <span className="capitalize">{item.kind}</span>
                    <span>·</span>
                    <span>{item.submittedBy}</span>
                    <span>·</span>
                    <span>{formatDistanceToNow(item.submittedAt, { addSuffix: true })}</span>
                  </div>
                </div>
                <StatusPill status={item.status} />
              </button>
            );
          })}
        </div>
      )}

      {active && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/80 p-4 backdrop-blur-md animate-fade-in" onClick={() => setActive(null)}>
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="border-b border-border px-6 py-4">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-background">
                  {React.createElement(KIND_ICON[active.kind], { className: 'h-5 w-5 text-foreground' })}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-foreground">{active.title}</h3>
                  {active.subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{active.subtitle}</p>}
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="capitalize">{active.kind}</span>
                    <span>·</span>
                    <span>{active.submittedBy}</span>
                    <span>·</span>
                    <span>{formatDistanceToNow(active.submittedAt, { addSuffix: true })}</span>
                  </div>
                </div>
                <StatusPill status={active.status} />
              </div>
            </header>

            <div className="space-y-4 px-6 py-5">
              {active.status !== 'pending' && active.comment && (
                <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs">
                  <div className="font-semibold text-foreground">{active.reviewedBy}</div>
                  <p className="mt-1 text-muted-foreground">{active.comment}</p>
                </div>
              )}

              {active.status === 'pending' && (
                <>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a review comment (optional)…"
                    rows={3}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleApprove}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-emerald-500 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-600"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={handleReject}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground hover:border-red-500/50 hover:text-red-400"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Reject
                    </button>
                  </div>
                </>
              )}

              {active.status !== 'pending' && (
                <button
                  type="button"
                  onClick={() => setActive(null)}
                  className="w-full rounded-md border border-border bg-card px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </BrandLayout>
  );
}

function StatusPill({ status }: { status: ApprovalStatus }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
        <CheckCircle2 className="h-2.5 w-2.5" />
        Approved
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-400">
        <XCircle className="h-2.5 w-2.5" />
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
      <Clock className="h-2.5 w-2.5" />
      Pending
    </span>
  );
}
