import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useNotificationsStore, type Notification } from '@/shared/store/notificationsStore';
import {
  Bell,
  MessageSquare,
  CheckCircle2,
  XCircle,
  UserPlus,
  Share2,
  Info,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const ICON_MAP: Record<string, React.ElementType> = {
  comment_reply: MessageSquare,
  comment_mention: MessageSquare,
  approval_requested: Info,
  approval_approved: CheckCircle2,
  approval_rejected: XCircle,
  member_invited: UserPlus,
  brand_shared: Share2,
  system: Info,
};

export function NotificationBell() {
  const navigate = useNavigate();
  const { items, unreadCount, markRead, markAllRead } = useNotificationsStore();
  const count = unreadCount();
  const recent = items.slice(0, 8);

  const handleClick = (notification: Notification) => {
    markRead(notification.id);
    if (notification.href) {
      navigate(notification.href);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {count > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-primary hover:underline font-normal"
            >
              Mark all read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {recent.length === 0 ? (
          <div className="py-6 text-center">
            <Bell className="h-6 w-6 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          recent.map((n) => {
            const Icon = ICON_MAP[n.type] || Info;
            return (
              <DropdownMenuItem
                key={n.id}
                onClick={() => handleClick(n)}
                className="flex items-start gap-3 py-3 cursor-pointer"
              >
                <div className="mt-0.5 shrink-0">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className={`text-sm leading-tight ${n.read ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="text-xs text-muted-foreground truncate">{n.body}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground/60">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </div>
                {!n.read && (
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                )}
              </DropdownMenuItem>
            );
          })
        )}

        {items.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => navigate('/dashboard/activity')}
              className="justify-center text-xs text-primary cursor-pointer"
            >
              View all activity
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
