import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { BarChart3, ArrowLeft, Clock, GitCommit, Users, FileText } from 'lucide-react';

export default function ActivityPage() {
  const navigate = useNavigate();

  const upcomingFeatures = [
    { icon: GitCommit, label: 'Brand edit history with diff view' },
    { icon: FileText, label: 'Export and download logs' },
    { icon: Users, label: 'Team member actions and collaboration events' },
    { icon: Clock, label: 'Timestamped audit trail for compliance' },
  ];

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-lg space-y-8">
          {/* Illustration area */}
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 rounded-full bg-primary/5 animate-pulse" />
            <div className="absolute inset-2 rounded-full bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-10 w-10 text-primary" />
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl font-bold tracking-tight">
              Activity Feed
            </h1>
            <p className="text-sm font-medium text-primary">
              Expected: Coming soon
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              A real-time feed of everything happening across your brands.
              Track edits, exports, team actions, and more — all in one place.
            </p>
          </div>

          {/* What to expect */}
          <div className="mx-auto max-w-sm space-y-3">
            {upcomingFeatures.map((feature) => (
              <div
                key={feature.label}
                className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3 text-left"
              >
                <feature.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">{feature.label}</span>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
