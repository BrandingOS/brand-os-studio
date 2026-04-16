// Phase 7 — upload + vectorize. Phase 1 ships a placeholder.
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function UploadScreen() {
  return (
    <div className="max-w-2xl mx-auto py-24 px-6 text-center">
      <h1 className="text-3xl font-bold mb-3">Upload & vectorize</h1>
      <p className="text-muted-foreground mb-6">
        Drop a PNG, JPG, or SVG and we'll turn it into an editable vector logo.
        Shipping in Phase 7.
      </p>
      <Button asChild variant="ghost" className="gap-2">
        <Link to="/logo-maker">
          <ArrowLeft className="w-4 h-4" />
          Back to mode select
        </Link>
      </Button>
    </div>
  );
}
