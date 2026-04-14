import { useEffect, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/components/ui/badge';
import { adminService } from '../services/adminService';
import { Activity, Loader2 } from 'lucide-react';

const EVENT_COLORS: Record<string, string> = {
  brand_created: 'bg-green-500',
  brand_updated: 'bg-blue-500',
  asset_uploaded: 'bg-purple-500',
  asset_exported: 'bg-indigo-500',
  guideline_updated: 'bg-cyan-500',
  guideline_published: 'bg-teal-500',
  comment_posted: 'bg-yellow-500',
  comment_resolved: 'bg-lime-500',
  approval_submitted: 'bg-orange-500',
  approval_approved: 'bg-green-600',
  approval_rejected: 'bg-red-500',
  member_invited: 'bg-pink-500',
  member_joined: 'bg-emerald-500',
  member_removed: 'bg-red-400',
};

export default function AdminActivity() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getActivity(200)
      .then(setEvents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6" /> Activity Log
        </h1>
        <p className="text-muted-foreground mt-1">All platform activity across all users</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : events.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No activity recorded yet
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="divide-y">
            {events.map((event) => (
              <div key={event.id} className="px-5 py-4 hover:bg-muted/30 flex items-start gap-4">
                <div className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${EVENT_COLORS[event.event_type] || 'bg-gray-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{event.title}</p>
                  {event.description && (
                    <p className="text-sm text-muted-foreground mt-0.5">{event.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    <Badge variant="outline" className="text-xs">
                      {event.event_type.replace(/_/g, ' ')}
                    </Badge>
                    {event.user_name && (
                      <span className="text-xs text-muted-foreground">by {event.user_name}</span>
                    )}
                    {event.brand_name && (
                      <span className="text-xs text-muted-foreground">in {event.brand_name}</span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(event.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
