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
import { useCallback, useMemo } from 'react';
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
  ArrowRight,
  Plus,
} from 'lucide-react';

type TabId = 'calendar' | 'posts' | 'drafts';
const TABS: TabId[] = ['calendar', 'posts', 'drafts'];

function isTab(v: string | null): v is TabId {
  return v !== null && (TABS as string[]).includes(v);
}

interface PostFormat {
  title: string;
  description: string;
  icon: React.ElementType;
  accent: string;
  // The social editor reads the picker internally; linking to the root page
  // lets users pick any format. Keeping this simple for v1.
}

const POST_FORMATS: PostFormat[] = [
  { title: 'Instagram post',   description: 'Square feed post (1080×1080).',     icon: Instagram, accent: 'from-pink-500 to-rose-600' },
  { title: 'Instagram story',  description: 'Vertical story (1080×1920).',       icon: Instagram, accent: 'from-fuchsia-500 to-pink-600' },
  { title: 'Facebook cover',   description: 'Page cover image (820×312).',       icon: Facebook,  accent: 'from-blue-500 to-indigo-600' },
  { title: 'LinkedIn post',    description: 'Feed post for LinkedIn.',           icon: Linkedin,  accent: 'from-sky-600 to-blue-700' },
  { title: 'Twitter / X post', description: 'Image post for X timelines.',       icon: Twitter,   accent: 'from-sky-400 to-blue-500' },
  { title: 'YouTube thumbnail',description: 'Video thumbnail (1280×720).',       icon: Youtube,   accent: 'from-red-500 to-rose-600' },
  { title: 'TikTok',           description: 'Vertical 9:16 for TikTok.',         icon: Layers,    accent: 'from-zinc-800 to-zinc-900' },
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
        actions={
          <Button
            size="sm"
            onClick={() => navigate(`/b/${slug}/social-media`)}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            New post
          </Button>
        }
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

      {activeTab === 'calendar' && <CalendarPlaceholder onCreate={() => navigate(`/b/${slug}/social-media`)} />}
      {activeTab === 'posts' && <PostsGrid slug={slug} onSelect={(_format) => navigate(`/b/${slug}/social-media`)} />}
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

function PostsGrid({
  slug: _slug,
  onSelect,
}: {
  slug: string;
  onSelect: (format: PostFormat) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {POST_FORMATS.map((f) => {
        const Icon = f.icon;
        return (
          <Card
            key={f.title}
            onClick={() => onSelect(f)}
            className="group relative overflow-hidden p-5 cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5"
          >
            <div
              className={`absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br ${f.accent} opacity-10 group-hover:opacity-20 transition-opacity`}
            />
            <div
              className={`relative w-11 h-11 rounded-xl bg-gradient-to-br ${f.accent} flex items-center justify-center mb-3`}
            >
              <Icon className="w-5 h-5 text-white" />
            </div>
            <h3 className="relative text-base font-semibold mb-1">{f.title}</h3>
            <p className="relative text-xs text-muted-foreground">{f.description}</p>
            <div className="relative mt-3 flex items-center text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              Create <ArrowRight className="h-3 w-3 ml-1" />
            </div>
          </Card>
        );
      })}
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
