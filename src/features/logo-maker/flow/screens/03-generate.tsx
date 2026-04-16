import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Sparkles, PenTool } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLogoMakerStore } from '../state/useLogoMakerStore';

// Phase 3 will replace this with a real 36-concept AI generation grid
// (Claude → Gemini 3 Pro Image pipeline). Until live keys land, we route
// users to the editor so the end-to-end flow stays walkable.

export default function GenerateScreen() {
  const navigate = useNavigate();
  const brief = useLogoMakerStore((s) => s.brief);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between px-6 py-3">
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link to="/logo-maker/brief">
              <ArrowLeft className="w-4 h-4" />
              Back to brief
            </Link>
          </Button>
          <span className="text-xs text-muted-foreground">Step 3 of 6</span>
          <div className="w-[120px]" aria-hidden />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-3">AI logo generation coming soon</h1>
          <p className="text-muted-foreground mb-6">
            The full 36-concept AI pipeline (Claude + Gemini 3 Pro Image) lands in Phase 3
            once the API keys are wired. For now, jump straight into the editor and build
            from scratch — every tool in the editor already works.
          </p>
          {brief.name && (
            <p className="text-xs text-muted-foreground/70 mb-8">
              Brief saved: <span className="text-foreground font-medium">{brief.name}</span>
              {brief.industry && <> · {brief.industry}</>}
              {brief.vibes.length > 0 && <> · {brief.vibes.join(', ')}</>}
            </p>
          )}
          <div className="flex items-center justify-center gap-2">
            <Button asChild variant="outline" className="gap-2">
              <Link to="/logo-maker/brief">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Link>
            </Button>
            <Button onClick={() => navigate('/logo-maker/editor/blank')} className="gap-2">
              <PenTool className="w-4 h-4" />
              Open editor
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
