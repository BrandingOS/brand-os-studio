import { PenTool, Plus } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';
import { useNavigate } from 'react-router-dom';

interface DesignToolModuleProps {
  brand: Brand;
}

export function DesignToolModule({ brand }: DesignToolModuleProps) {
  const navigate = useNavigate();

  const handleCreateDesign = () => {
    navigate(`/editor/design/${brand.slug}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Design Tool</h2>
        <p className="text-muted-foreground">Create custom branded designs from scratch.</p>
      </div>

      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-6">
          <PenTool className="w-10 h-10 text-primary/60" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Create a new blank design</h3>
        <p className="text-muted-foreground text-sm text-center max-w-md mb-6">
          Start with a blank canvas and use your brand colors, fonts, and logos to create something unique.
        </p>
        <button
          onClick={handleCreateDesign}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Create Design
        </button>
      </div>

      <div className="border-t border-border pt-8">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Your Designs</h3>
        <div className="text-center py-12">
          <div className="w-14 h-14 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-muted-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-muted-foreground text-sm">You haven't created any designs yet.</p>
        </div>
      </div>
    </div>
  );
}
