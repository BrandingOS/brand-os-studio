// Phase 4.4 — admin templates approval queue.
//
// Lists every template with upload_status = 'pending'. Per row:
// thumbnail, name, uploader, category, mood, tags, full preview;
// actions: Approve, Reject (with reason), open in editor for
// inspection.
//
// Auth: gated via useIsAdmin() — non-admin users see a 403 page.
// (Real RBAC review owed; see hook header.)

import { useCallback, useEffect, useState } from 'react';
import { Check, X as XIcon, ExternalLink, Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useIsAdmin } from '@/shared/hooks/useIsAdmin';
import { SERVICE_KEYS } from '@/core';
import { container as serviceContainer } from '@/core/container/ServiceContainer';
import type { ITemplatesService } from '@/core/services/ITemplatesService';
import type { Template, TemplateCategory } from '@/features/templates/types';

export default function AdminTemplatesQueuePage() {
  const { isAdmin, isLoading: authLoading } = useIsAdmin();
  const templates = serviceContainer.has(SERVICE_KEYS.TEMPLATES)
    ? serviceContainer.get<ITemplatesService>(SERVICE_KEYS.TEMPLATES)
    : null;
  const [pending, setPending] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Record<string, TemplateCategory>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const refresh = useCallback(async () => {
    if (!templates) return;
    setLoading(true);
    const [rows, catRows] = await Promise.all([
      templates.listTemplates({
        source: 'user_uploaded', uploadStatus: 'pending', visibility: 'public',
      }),
      templates.listCategories(),
    ]);
    setPending(rows);
    setCategories(Object.fromEntries(catRows.map((c) => [c.id, c])));
    setLoading(false);
  }, [templates]);

  useEffect(() => { void refresh(); }, [refresh]);

  const onApprove = useCallback(async (t: Template) => {
    if (!templates) return;
    setBusyId(t.id);
    try {
      await templates.updateTemplate(t.id, {
        uploadStatus: 'approved',
        approvedAt: new Date().toISOString(),
      });
      toast.success(`Approved "${t.name}"`);
      await refresh();
    } catch (err) {
      toast.error(`Approve failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusyId(null);
    }
  }, [templates, refresh]);

  const onReject = useCallback(async (t: Template) => {
    if (!templates) return;
    if (rejectReason.trim().length === 0) {
      toast.error('Rejection reason is required.');
      return;
    }
    setBusyId(t.id);
    try {
      await templates.updateTemplate(t.id, {
        uploadStatus: 'rejected',
        rejectionReason: rejectReason.trim(),
      });
      toast.success(`Rejected "${t.name}"`);
      setRejectingId(null);
      setRejectReason('');
      await refresh();
    } catch (err) {
      toast.error(`Reject failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusyId(null);
    }
  }, [templates, rejectReason, refresh]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div data-admin-403 className="min-h-screen flex flex-col items-center justify-center gap-3 p-8 text-center">
        <Shield className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Admin only</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          The community template approval queue is restricted to admins.
        </p>
        <Link to="/" className="text-sm text-primary hover:underline">Go home</Link>
      </div>
    );
  }

  if (!templates) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Templates service not configured.
      </div>
    );
  }

  return (
    <div data-admin-templates-queue className="min-h-screen p-6 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Community templates queue</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {pending.length} {pending.length === 1 ? 'template' : 'templates'} awaiting review.
        </p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : pending.length === 0 ? (
        <div data-admin-queue-empty className="text-center py-16 text-muted-foreground">
          Queue is empty. All caught up.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pending.map((t) => (
            <article
              key={t.id}
              data-pending-template
              data-template-id={t.id}
              className="rounded-xl border bg-card overflow-hidden flex flex-col"
              style={{ borderColor: 'var(--border)' }}
            >
              <div
                className="bg-muted/20"
                style={{ aspectRatio: `${t.width}/${t.height}` }}
              >
                <img src={t.thumbnailUrl} alt={t.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-3 flex-1 flex flex-col gap-1.5">
                <h3 className="font-medium text-base">{t.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {categories[t.categoryId]?.name ?? t.categoryId} · {t.mood ?? 'no mood'}
                </p>
                {t.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {t.tags.slice(0, 6).map((tag) => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/50">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                <p className="text-[11px] text-muted-foreground mt-1">
                  Uploaded {t.uploadedAt ? new Date(t.uploadedAt).toLocaleDateString() : 'unknown'}
                </p>

                {rejectingId === t.id ? (
                  <div className="mt-3 flex flex-col gap-2">
                    <textarea
                      data-reject-reason
                      rows={2}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Why is this being rejected?"
                      className="rounded-md border px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                      style={{ borderColor: 'var(--border)' }}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        data-reject-confirm
                        disabled={busyId === t.id || rejectReason.trim().length === 0}
                        onClick={() => void onReject(t)}
                        className="flex-1 rounded-md bg-red-600 text-white text-xs px-2 py-1.5 font-medium disabled:opacity-50 hover:bg-red-700"
                      >
                        Confirm reject
                      </button>
                      <button
                        type="button"
                        onClick={() => { setRejectingId(null); setRejectReason(''); }}
                        className="rounded-md border text-xs px-2 py-1.5"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      data-approve
                      disabled={busyId === t.id}
                      onClick={() => void onApprove(t)}
                      className="flex-1 rounded-md bg-green-600 text-white text-xs px-2 py-1.5 font-medium disabled:opacity-50 hover:bg-green-700 flex items-center justify-center gap-1"
                    >
                      <Check className="h-3.5 w-3.5" /> Approve
                    </button>
                    <button
                      type="button"
                      data-reject-open
                      disabled={busyId === t.id}
                      onClick={() => setRejectingId(t.id)}
                      className="flex-1 rounded-md border border-red-600 text-red-600 text-xs px-2 py-1.5 font-medium disabled:opacity-50 hover:bg-red-50 flex items-center justify-center gap-1"
                    >
                      <XIcon className="h-3.5 w-3.5" /> Reject
                    </button>
                    <a
                      href={`/b/${t.uploadedByUserId ?? 'preview'}/design/${t.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md border text-xs px-2 py-1.5"
                      style={{ borderColor: 'var(--border)' }}
                      title="Open in editor"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
