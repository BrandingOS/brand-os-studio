/**
 * Content — social content planning & creation.
 *
 * Tabs:
 *   - Calendar  → month-grid placeholder (v1 stub; persistence follow-up)
 *   - Posts     → social format launcher (Instagram, FB, LinkedIn, etc.)
 *   - Drafts    → WIP designs filtered by status (stub for v1)
 *
 * The social editor itself lives fullscreen at /b/:slug/social-media —
 * Posts tab launches into it with the picker pre-opened.
 */
import { useCallback, useMemo, useState } from 'react';
import {
  useParams,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { InnerNavConfig } from '@/shared/layouts/InnerNavRail';
import { useBrandPageConfig } from '@/shared/layouts/brandPageConfig';
import {
  CalendarDays,
  Megaphone,
  FileText,
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  Twitter,
  Layers,
  Plus,
} from 'lucide-react';

type TabId = 'calendar' | 'posts' | 'drafts';
const TABS: TabId[] = ['calendar', 'posts', 'drafts'];

function isTab(v: string | null): v is TabId {
  return v !== null && (TABS as string[]).includes(v);
}

type Platform = 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube';

interface PostFormat {
  title: string;
  platform: Platform;
  format: string;
  width: number;
  height: number;
  icon: React.ElementType;
  accent: string;
}

const POST_FORMATS: PostFormat[] = [
  { title: 'Instagram Post',        platform: 'instagram', format: 'post',  width: 1080, height: 1080, icon: Instagram, accent: 'from-pink-500 to-rose-600' },
  { title: 'Instagram Story',       platform: 'instagram', format: 'story', width: 1080, height: 1920, icon: Instagram, accent: 'from-fuchsia-500 to-pink-600' },
  { title: 'Instagram Reel Cover',  platform: 'instagram', format: 'reel',  width: 1080, height: 1920, icon: Instagram, accent: 'from-rose-500 to-pink-600' },
  { title: 'Facebook Post',         platform: 'facebook',  format: 'post',  width: 1200, height: 630,  icon: Facebook,  accent: 'from-blue-500 to-indigo-600' },
  { title: 'Facebook Cover',        platform: 'facebook',  format: 'cover', width: 1640, height: 624,  icon: Facebook,  accent: 'from-blue-600 to-sky-700' },
  { title: 'LinkedIn Post',         platform: 'linkedin',  format: 'post',  width: 1200, height: 627,  icon: Linkedin,  accent: 'from-sky-600 to-blue-700' },
  { title: 'LinkedIn Cover',        platform: 'linkedin',  format: 'cover', width: 1584, height: 396,  icon: Linkedin,  accent: 'from-sky-700 to-indigo-700' },
  { title: 'Twitter / X Post',      platform: 'twitter',   format: 'post',  width: 1200, height: 675,  icon: Twitter,   accent: 'from-sky-400 to-blue-500' },
  { title: 'Twitter / X Banner',    platform: 'twitter',   format: 'cover', width: 1500, height: 500,  icon: Twitter,   accent: 'from-sky-500 to-cyan-600' },
  { title: 'YouTube Thumbnail',     platform: 'youtube',   format: 'post',  width: 1280, height: 720,  icon: Youtube,   accent: 'from-red-500 to-rose-600' },
  { title: 'YouTube Channel Art',   platform: 'youtube',   format: 'cover', width: 2560, height: 1440, icon: Youtube,   accent: 'from-red-600 to-rose-700' },
  { title: 'TikTok Cover',          platform: 'tiktok',    format: 'post',  width: 1080, height: 1920, icon: Layers,    accent: 'from-zinc-800 to-zinc-900' },
];

const PLATFORM_FILTERS: { id: Platform | 'all'; label: string; icon: React.ElementType }[] = [
  { id: 'all',       label: 'All',       icon: Megaphone },
  { id: 'instagram', label: 'Instagram', icon: Instagram },
  { id: 'facebook',  label: 'Facebook',  icon: Facebook },
  { id: 'twitter',   label: 'Twitter/X', icon: Twitter },
  { id: 'linkedin',  label: 'LinkedIn',  icon: Linkedin },
  { id: 'tiktok',    label: 'TikTok',    icon: Layers },
  { id: 'youtube',   label: 'YouTube',   icon: Youtube },
];

export default function ContentHubPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { brand, isLoading, error } = useBrandBySlug(slug);

  const activeTab: TabId = useMemo(() => {
    const t = searchParams.get('tab');
    return isTab(t) ? t : 'calendar';
  }, [searchParams]);

  const handleTabChange = useCallback(
    (value: string) => {
      if (!isTab(value)) return;
      const next = new URLSearchParams(searchParams);
      if (value === 'calendar') next.delete('tab');
      else next.set('tab', value);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const innerNav = useMemo<InnerNavConfig | undefined>(
    () =>
      slug
        ? {
            title: 'Content',
            icon: CalendarDays,
            storageKey: 'brandos:content-nav-open',
            groups: [
              {
                id: 'tabs',
                label: 'Sections',
                items: [
                  { id: 'calendar', label: 'Calendar', icon: CalendarDays, href: `/b/${slug}/content` },
                  { id: 'posts',    label: 'Posts',    icon: Megaphone,    href: `/b/${slug}/content?tab=posts` },
                  { id: 'drafts',   label: 'Drafts',   icon: FileText,     href: `/b/${slug}/content?tab=drafts` },
                ],
              },
            ],
          }
        : undefined,
    [slug],
  );

  useBrandPageConfig({ brandName: brand?.name, maxWidth: '7xl', innerNav });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !brand || !slug) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">{error || 'Brand not found.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        compact
        title="Content"
        subtitle="Plan, create, and schedule social media posts."
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarDays className="w-4 h-4" />
            <span>Calendar</span>
          </TabsTrigger>
          <TabsTrigger value="posts" className="gap-2">
            <Megaphone className="w-4 h-4" />
            <span>Posts</span>
          </TabsTrigger>
          <TabsTrigger value="drafts" className="gap-2">
            <FileText className="w-4 h-4" />
            <span>Drafts</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === 'calendar' && (
        <CalendarPlaceholder
          onCreate={() =>
            navigate(`/b/${slug}/social-media?platform=instagram&format=post`)
          }
        />
      )}
      {activeTab === 'posts' && (
        <PostsGrid
          onSelect={(f) =>
            navigate(`/b/${slug}/social-media?platform=${f.platform}&format=${f.format}`)
          }
        />
      )}
      {activeTab === 'drafts' && <DraftsEmpty onBrowse={() => navigate(`/b/${slug}/folders`)} />}
    </div>
  );
}

function CalendarPlaceholder({ onCreate }: { onCreate: () => void }) {
  // v1 stub — a visual month grid with no persistence. The real scheduler
  // needs a `scheduledPosts` collection on the brand store + server sync;
  // scoped to a follow-up PR.
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const monthName = today.toLocaleString('default', { month: 'long' });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: firstDay }, () => null)
    .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold">{monthName} {year}</h3>
            <p className="text-xs text-muted-foreground">
              Scheduling is local to this browser in v1. Cloud sync coming soon.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onCreate} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Schedule post
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
            <div key={d} className="px-2 py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => (
            <div
              key={i}
              className={`aspect-square rounded-md border border-border/50 p-2 text-xs ${
                day === today.getDate() ? 'bg-primary/10 border-primary/40 text-primary font-semibold' : 'text-muted-foreground'
              } ${day === null ? 'opacity-0 pointer-events-none' : 'hover:bg-muted/40 cursor-pointer'}`}
            >
              {day ?? ''}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function PostsGrid({ onSelect }: { onSelect: (format: PostFormat) => void }) {
  const [platform, setPlatform] = useState<Platform | 'all'>('all');

  const visible = useMemo(
    () => (platform === 'all' ? POST_FORMATS : POST_FORMATS.filter((f) => f.platform === platform)),
    [platform],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {PLATFORM_FILTERS.map((p) => {
          const Icon = p.icon;
          const active = platform === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setPlatform(p.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
                active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted/60 hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {visible.map((f) => {
          const Icon = f.icon;
          const ratio = f.width / f.height;
          const isPortrait = ratio < 0.9;
          const isLandscape = ratio > 1.5;
          // Compact visual aspect so the grid reads evenly.
          const thumbClass = isPortrait
            ? 'aspect-[3/4]'
            : isLandscape
              ? 'aspect-[16/9]'
              : 'aspect-square';
          return (
            <Card
              key={`${f.platform}-${f.format}`}
              onClick={() => onSelect(f)}
              className="group p-3 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div
                className={`${thumbClass} rounded-lg bg-gradient-to-br ${f.accent} flex items-center justify-center mb-3 overflow-hidden`}
              >
                <Icon className="h-8 w-8 text-white/90" />
              </div>
              <h3 className="text-sm font-semibold truncate">{f.title}</h3>
              <p className="text-xs text-muted-foreground">
                {f.width} × {f.height}
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function DraftsEmpty({ onBrowse }: { onBrowse: () => void }) {
  return (
    <Card className="p-10 text-center bg-muted/20">
      <FileText className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
      <p className="text-sm font-medium mb-1">No drafts yet</p>
      <p className="text-xs text-muted-foreground mb-4">
        In-progress designs will appear here. Open Folders to see saved work.
      </p>
      <Button variant="outline" size="sm" onClick={onBrowse}>
        Open Folders
      </Button>
    </Card>
  );
}
