import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { activityService, type ActivityEvent, type ActivityEventType } from '@/shared/services/activityService';
import { useBrandStore } from '@/shared/store/brandStore';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  Clock,
  Edit3,
  Plus,
  Upload,
  Download,
  FileText,
  MessageSquare,
  CheckCircle2,
  XCircle,
  UserPlus,
  Users,
  Share2,
  Filter,
} from 'lucide-react';

const EVENT_CONFIG: Record<ActivityEventType, { icon: React.ElementType; color: string; label: string }> = {
  brand_created:        { icon: Plus,          color: 'text-green-500',  label: 'Brand Created' },
  brand_updated:        { icon: Edit3,         color: 'text-blue-500',   label: 'Brand Updated' },
  asset_uploaded:       { icon: Upload,        color: 'text-violet-500', label: 'Asset Uploaded' },
  asset_exported:       { icon: Download,      color: 'text-orange-500', label: 'Asset Exported' },
  guideline_updated:    { icon: FileText,      color: 'text-blue-500',   label: 'Guideline Updated' },
  guideline_published:  { icon: Share2,        color: 'text-green-500',  label: 'Guideline Published' },
  comment_posted:       { icon: MessageSquare, color: 'text-sky-500',    label: 'Comment' },
  comment_resolved:     { icon: CheckCircle2,  color: 'text-green-500',  label: 'Comment Resolved' },
  approval_submitted:   { icon: FileText,      color: 'text-amber-500',  label: 'Approval Requested' },
  approval_approved:    { icon: CheckCircle2,  color: 'text-green-500',  label: 'Approved' },
  approval_rejected:    { icon: XCircle,       color: 'text-red-500',    label: 'Rejected' },
  member_invited:       { icon: UserPlus,      color: 'text-violet-500', label: 'Member Invited' },
  member_joined:        { icon: Users,         color: 'text-green-500',  label: 'Member Joined' },
  member_removed:       { icon: Users,         color: 'text-red-500',    label: 'Member Removed' },
};

type FilterType = 'all' | 'edits' | 'comments' | 'approvals' | 'team';

const FILTER_MAP: Record<FilterType, ActivityEventType[] | null> = {
  all: null,
  edits: ['brand_created', 'brand_updated', 'asset_uploaded', 'asset_exported', 'guideline_updated', 'guideline_published'],
  comments: ['comment_posted', 'comment_resolved'],
  approvals: ['approval_submitted', 'approval_approved', 'approval_rejected'],
  team: ['member_invited', 'member_joined', 'member_removed'],
};

export default function ActivityPage() {
  const navigate = useNavigate();
  const { list: brands } = useBrandStore();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      let fetched = await activityService.list({ limit: 100 });

      // If no events yet, seed from brand timestamps
      if (fetched.length === 0 && brands.length > 0) {
        for (const b of brands) {
          const created = new Date(b.createdAt).getTime();
          const updated = new Date(b.updatedAt).getTime();
          fetched.push({
            id: `${b.id}:c`,
            brandId: b.id,
            brandName: b.name,
            eventType: 'brand_created',
            title: `${b.name} was created`,
            createdAt: created || Date.now(),
          });
          if (updated && updated !== created) {
            fetched.push({
              id: `${b.id}:u`,
              brandId: b.id,
              brandName: b.name,
              eventType: 'brand_updated',
              title: `${b.name} was updated`,
              createdAt: updated,
            });
          }
        }
        fetched.sort((a, b) => b.createdAt - a.createdAt);
      }

      setEvents(fetched);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = filter === 'all'
    ? events
    : events.filter((e) => FILTER_MAP[filter]?.includes(e.eventType));

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Activity</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track everything happening across your brands
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {(Object.keys(FILTER_MAP) as FilterType[]).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
              className="text-xs capitalize whitespace-nowrap"
            >
              {f === 'all' && <Filter className="h-3 w-3 mr-1" />}
              {f}
            </Button>
          ))}
        </div>

        {/* Event list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <Card className="p-12 text-center">
            <Clock className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No activity yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Actions like editing brands, posting comments, and exporting assets will appear here.
            </p>
          </Card>
        ) : (
          <div className="space-y-1">
            {filteredEvents.map((event) => {
              const config = EVENT_CONFIG[event.eventType] || EVENT_CONFIG.brand_updated;
              const Icon = config.icon;
              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => event.brandId && navigate(`/b/${brands.find(b => b.id === event.brandId)?.slug || ''}`)}
                  className="flex w-full items-center gap-4 rounded-xl px-4 py-3.5 text-left transition hover:bg-muted/40"
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background shrink-0`}>
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{event.title}</p>
                    {event.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{event.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {event.brandName && (
                      <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">
                        {event.brandName}
                      </Badge>
                    )}
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
