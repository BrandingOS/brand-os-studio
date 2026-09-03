import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, RotateCcw, ArrowRight, Copy, Globe, MessageSquare, Film, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { LogoSlot } from '@/shared/services/mockup/shared';
import { useLogoMakerStore } from '../state/useLogoMakerStore';
import { buildContext, DEFAULT_PALETTE } from '../utils/brand-context';

// Phase 9 will replace the in-memory "brand id" with a real POST /brands
// that persists the Brand record to Supabase and generates a canonical slug.
// Phase 6 gives us the working UI with a deterministic placeholder ID so the
// flow is fully walkable.

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'brand';
}

export default function CompleteScreen() {
  const navigate = useNavigate();
  const { brandId: brandIdParam } = useParams();
  const brief = useLogoMakerStore((s) => s.brief);
  const editedSVG = useLogoMakerStore((s) => s.editedSVG);
  const setScreen = useLogoMakerStore((s) => s.setScreen);
  const reset = useLogoMakerStore((s) => s.reset);

  useEffect(() => setScreen(6), [setScreen]);

  const ctx = useMemo(() => buildContext(brief, editedSVG, DEFAULT_PALETTE), [brief, editedSVG]);
  const slug = useMemo(() => slugify(ctx.brandName), [ctx.brandName]);
  const brandId = brandIdParam ?? 'brd_pending';
  const shareLink = `${window.location.origin}/b/${slug}`;

  const [copied, setCopied] = useState(false);
  const copyLink = () => {
    void navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-[780px]">
        {/* Success */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            {ctx.brandName} is now live in your workspace
          </h1>
          <p className="text-muted-foreground mt-2">
            Brand registered · all assets synced · accessible in every BrandingOS tool.
          </p>
          <p className="text-[11px] text-muted-foreground/60 mt-2">
            Supabase persistence lands in Phase 9 — today the brand is staged in memory.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
          {/* Brand profile */}
          <div className="rounded-lg border border-border bg-card/50 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-md overflow-hidden flex items-center justify-center"
                style={{ backgroundColor: ctx.primaryColor }}
              >
                <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <LogoSlot ctx={ctx} x={15} y={15} width={70} height={70} fill="#ffffff" />
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold truncate">{ctx.brandName}</h3>
                {ctx.tagline && <p className="text-xs text-muted-foreground truncate">{ctx.tagline}</p>}
              </div>
            </div>
            <dl className="space-y-2 text-xs">
              <Row k="Brand ID" v={brandId} mono />
              <Row k="Slug" v={slug} mono />
              <Row k="Created" v={new Date().toLocaleDateString()} />
              <Row k="Status" v="Draft" />
            </dl>
          </div>

          {/* Next steps */}
          <div className="rounded-lg border border-border bg-card/50 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Next — do more with {ctx.brandName}
            </p>
            <div className="space-y-1.5">
              <NextStep
                icon={<Globe className="w-4 h-4" />}
                label="Generate landing page"
                note="Coming soon"
                disabled
              />
              {/* Pointed at the social-media editor, removed 2026-09-03.
                  Same honest shape as the entries around it rather than a
                  link into a page that no longer exists. */}
              <NextStep
                icon={<MessageSquare className="w-4 h-4" />}
                label="Create social posts"
                note="Coming soon"
                disabled
              />
              <NextStep
                icon={<Film className="w-4 h-4" />}
                label="Brand video ad"
                note="Coming soon"
                disabled
              />
              {/* Pointed at /dashboard/settings/members, which has never been a
                  route — it 404'd. BrandOS is single-user for now, so this
                  takes the same honest "coming soon" shape as the entry above
                  rather than linking somewhere that invites nobody. */}
              <NextStep
                icon={<Users className="w-4 h-4" />}
                label="Invite team"
                note="Coming soon"
                disabled
              />
            </div>
          </div>
        </div>

        {/* Share link */}
        <div className="rounded-lg border-2 border-dashed border-border p-4 mb-8">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Public share link enabled</p>
              <p className="text-xs text-muted-foreground">
                Anyone with the link can view {ctx.brandName}'s public showcase.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <code className="hidden sm:inline-block text-xs font-mono bg-muted px-2 py-1 rounded truncate max-w-[240px]">
                {shareLink}
              </code>
              <Button size="sm" variant="outline" onClick={copyLink} className="gap-1.5">
                {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom actions */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              reset();
              navigate('/logo-maker');
            }}
          >
            <RotateCcw className="w-4 h-4" />
            Start another
          </Button>
          <Button asChild className="gap-2">
            <Link to="/dashboard">
              Open dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-1.5 last:border-0">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className={cn('truncate', mono && 'font-mono text-[11px]')}>{v}</dd>
    </div>
  );
}

function NextStep({
  icon,
  label,
  note,
  to,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  note?: string;
  to?: string;
  disabled?: boolean;
}) {
  const body = (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-md px-3 py-2 border transition-colors',
        disabled
          ? 'border-transparent bg-muted/30 text-muted-foreground cursor-not-allowed'
          : 'border-border bg-background hover:bg-accent/40 hover:border-muted-foreground/40 text-foreground',
      )}
    >
      <div className="flex items-center gap-2 text-sm">
        <span className={disabled ? '' : 'text-primary'}>{icon}</span>
        {label}
      </div>
      {note ? (
        <span className="text-[10px] uppercase tracking-wider">{note}</span>
      ) : (
        <ArrowRight className="w-3.5 h-3.5" />
      )}
    </div>
  );

  if (disabled || !to) {
    return (
      <button
        type="button"
        disabled={disabled}
        className="w-full text-left"
        onClick={() => !disabled && toast(`${label} — coming soon`)}
      >
        {body}
      </button>
    );
  }
  return (
    <Link to={to} className="block">
      {body}
    </Link>
  );
}
