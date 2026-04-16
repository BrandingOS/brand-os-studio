import { Link } from 'react-router-dom';
import { MonitorSmartphone, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Per spec §3.3: "Full editor is desktop-only for v1. On mobile, show message
// 'The editor works best on desktop.'" Mode select / brief / brand kit /
// complete all render fine on mobile — only the Editor screen swaps to this.

export function MobileEditorFallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-5">
        <MonitorSmartphone className="w-6 h-6 text-primary" />
      </div>
      <h1 className="text-2xl font-bold mb-2">The editor is desktop-only for now</h1>
      <p className="text-muted-foreground max-w-md mb-6">
        Designing vector logos on a small touchscreen isn't fun. Finish on a
        laptop or desktop — your draft is saved and will be waiting when you
        sign in there.
      </p>
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" className="gap-2">
          <Link to="/logo-maker">
            <ArrowLeft className="w-4 h-4" />
            Back to mode select
          </Link>
        </Button>
      </div>
    </div>
  );
}
