/**
 * CommentsPanel — floating side panel that shows all threads on the
 * current page. Mountable on any page by passing brandId + pageKey.
 *
 * v5 PRD Phase 9.
 */
import * as React from 'react';
import { MessageSquare, X, Send, Check, Reply, Trash2 } from 'lucide-react';
import { useCommentsStore, type Comment } from './commentsStore';
import { useSessionStore } from '@/shared/store/sessionStore';
import { activityService } from '@/shared/services/activityService';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface CommentsPanelProps {
  brandId: string;
  pageKey: string;
  /** Optional human-readable label for the page in the header. */
  pageLabel?: string;
}

export function CommentsPanel({ brandId, pageKey, pageLabel }: CommentsPanelProps) {
  const [open, setOpen] = React.useState(false);
  const { threadsForPage, countForPage, add } = useCommentsStore();
  const user = useSessionStore((s) => s.user);
  const author = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'You';
  const authorEmail = user?.email;
  const [draft, setDraft] = React.useState('');

  const threads = threadsForPage(brandId, pageKey);
  const count = countForPage(brandId, pageKey);

  const startThread = () => {
    if (!draft.trim()) return;
    const threadId = crypto.randomUUID();
    const body = draft.trim();
    add({
      threadId,
      brandId,
      pageKey,
      author,
      authorEmail,
      body,
    });
    // Phase 7.4 — log to the activity feed so /dashboard/activity
    // surfaces threads as they happen across the workspace.
    void activityService.log({
      brandId,
      userName: author,
      eventType: 'comment_posted',
      title: `${author} started a thread`,
      description: body.length > 80 ? body.slice(0, 80) + '…' : body,
      metadata: { pageKey, threadId },
    });
    setDraft('');
  };

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-6 right-24 z-30 inline-flex items-center gap-2 rounded-full border border-border bg-card/90 px-4 py-3 shadow-2xl backdrop-blur-xl transition hover:-translate-y-0.5',
          open && 'hidden',
        )}
        aria-label="Open comments"
      >
        <MessageSquare className="h-4 w-4 text-foreground" />
        <span className="hidden text-sm font-medium text-foreground sm:inline">Comments</span>
        {count > 0 && (
          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
            {count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-background/40 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)} />
          <aside className="fixed bottom-0 right-0 top-0 z-50 flex w-full flex-col border-l border-border bg-card/95 shadow-2xl backdrop-blur-2xl sm:bottom-4 sm:right-4 sm:top-auto sm:h-[80vh] sm:max-h-[700px] sm:w-[400px] sm:rounded-2xl sm:border animate-slide-in-right">
            <header className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Comments</h3>
                <p className="text-[11px] text-muted-foreground">{pageLabel ?? pageKey} · {threads.length} thread{threads.length === 1 ? '' : 's'}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {threads.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <MessageSquare className="h-8 w-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-semibold text-foreground">No comments yet</p>
                  <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">
                    Start a thread below to discuss this page with your team.
                  </p>
                </div>
              ) : (
                <ol className="space-y-4">
                  {threads.map((thread) => (
                    <Thread key={thread[0].id} thread={thread} />
                  ))}
                </ol>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                startThread();
              }}
              className="border-t border-border p-3"
            >
              <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 focus-within:border-primary/50">
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Start a new thread…"
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!draft.trim()}
                  className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground transition disabled:opacity-40"
                  aria-label="Send"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>
          </aside>
        </>
      )}
    </>
  );
}

function Thread({ thread }: { thread: Comment[] }) {
  const root = thread[0];
  const replies = thread.slice(1);
  const { add, resolve, reopen, remove } = useCommentsStore();
  const user = useSessionStore((s) => s.user);
  const author = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'You';
  const [replying, setReplying] = React.useState(false);
  const [draft, setDraft] = React.useState('');

  const submit = () => {
    if (!draft.trim()) return;
    const body = draft.trim();
    add({
      threadId: root.threadId,
      brandId: root.brandId,
      pageKey: root.pageKey,
      anchor: root.anchor,
      author,
      authorEmail: user?.email,
      body,
      parentId: root.id,
    });
    // Phase 7.4 — log replies as comment activity too. The /dashboard
    // activity page already groups by brand so this naturally clusters
    // under the parent thread's brand.
    void activityService.log({
      brandId: root.brandId,
      userName: author,
      eventType: 'comment_posted',
      title: `${author} replied`,
      description: body.length > 80 ? body.slice(0, 80) + '…' : body,
      metadata: { pageKey: root.pageKey, threadId: root.threadId, parentId: root.id },
    });
    setDraft('');
    setReplying(false);
  };

  return (
    <li className={cn('rounded-xl border border-border bg-background/50 p-3', root.resolved && 'opacity-60')}>
      <CommentRow comment={root} onDelete={() => remove(root.id)} />
      {replies.length > 0 && (
        <ol className="mt-2 space-y-2 border-l border-border pl-3">
          {replies.map((c) => (
            <li key={c.id}>
              <CommentRow comment={c} onDelete={() => remove(c.id)} />
            </li>
          ))}
        </ol>
      )}
      <div className="mt-2 flex items-center gap-2">
        {!replying ? (
          <button
            type="button"
            onClick={() => setReplying(true)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
          >
            <Reply className="h-3 w-3" />
            Reply
          </button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex flex-1 items-center gap-1.5"
          >
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Reply…"
              autoFocus
              className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs focus:border-primary/50 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground"
            >
              Send
            </button>
          </form>
        )}
        <span className="ml-auto" />
        {root.resolved ? (
          <button
            type="button"
            onClick={() => reopen(root.threadId)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
          >
            Reopen
          </button>
        ) : (
          <button
            type="button"
            onClick={() => resolve(root.threadId)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300"
          >
            <Check className="h-3 w-3" />
            Resolve
          </button>
        )}
      </div>
    </li>
  );
}

function CommentRow({ comment, onDelete }: { comment: Comment; onDelete: () => void }) {
  const initials = comment.author.slice(0, 2).toUpperCase();
  return (
    <div className="flex items-start gap-2">
      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="font-semibold text-foreground">{comment.author}</span>
          <span className="text-muted-foreground">{formatDistanceToNow(comment.createdAt, { addSuffix: true })}</span>
          <button
            type="button"
            onClick={onDelete}
            className="ml-auto text-muted-foreground opacity-0 transition hover:text-red-400 group-hover:opacity-100"
            aria-label="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-foreground">{comment.body}</p>
      </div>
    </div>
  );
}
