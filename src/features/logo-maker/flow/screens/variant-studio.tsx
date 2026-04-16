import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, RefreshCw, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { identityEngine, VARIANT_LABELS, VARIANT_ORDER, type IdentitySystem, type VariantId } from '../../identity-engine';
import { useLogoMakerStore } from '../state/useLogoMakerStore';
import { DEFAULT_PALETTE } from '../utils/brand-context';

const draftKey = (id: string) => `logo-maker-flow-editor:${id}`;

// Backdrop by variant to help each one self-identify at a glance.
const BACKGROUNDS: Partial<Record<VariantId, string>> = {
  dark_bg: '#0A0A0A',
  light_bg: '#F8FAFC',
  mono_white: '#111111',
  transparent: 'repeating',
  favicon: '#111111',
  social_avatar: '#ffffff',
  print_safe: '#ffffff',
  watermark: '#EFEFEF',
};

export default function VariantStudioScreen() {
  const navigate = useNavigate();
  const { logoId = 'blank' } = useParams();
  const [params] = useSearchParams();
  const system = useResolveSystem(logoId);
  const [regenTick, setRegenTick] = useState(0);

  const setScreen = useLogoMakerStore((s) => s.setScreen);
  useEffect(() => {
    // Variant Studio is between Editor (4) and Brand Kit (5); keep the store
    // pointed at 4 so "back to editor" makes sense.
    setScreen(4);
  }, [setScreen]);

  const variants = useMemo(() => {
    if (!system) return null;
    return VARIANT_ORDER.map((id) => ({ id, label: VARIANT_LABELS[id], doc: system.variants[id] }));
  }, [system, regenTick]);

  const regenerate = () => {
    if (!system) return;
    identityEngine.regenerateVariants(system.id);
    setRegenTick((t) => t + 1);
    toast.success('Variants regenerated.');
  };

  if (!system) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-semibold mb-2">No logo found</h1>
          <p className="text-muted-foreground mb-4">
            The variant studio needs a primary logo. Open the editor first.
          </p>
          <Button asChild>
            <Link to="/logo-maker/editor/blank">Open editor</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-[1280px] mx-auto flex items-center justify-between px-6 py-3 gap-4">
          <Button asChild variant="ghost" size="sm" className="gap-2 shrink-0">
            <Link to={`/logo-maker/editor/${logoId}`}>
              <ArrowLeft className="w-4 h-4" />
              Editor
            </Link>
          </Button>
          <div className="min-w-0 text-center flex-1">
            <h1 className="text-base font-semibold truncate">Variant Studio</h1>
            <p className="text-[11px] text-muted-foreground">
              {VARIANT_ORDER.length} variants · auto-generated from your primary logo
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={regenerate} className="gap-2">
              <RefreshCw className="w-3.5 h-3.5" />
              Regenerate
            </Button>
            <Button asChild size="sm" className="gap-2">
              <Link to={`/logo-maker/brand-kit/${logoId}`}>
                Brand kit
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1280px] mx-auto w-full px-6 py-8">
        <div className="mb-6 rounded-lg border border-border bg-card/40 px-4 py-3 text-sm">
          <p className="font-medium">Every variant is editable.</p>
          <p className="text-muted-foreground text-xs mt-0.5">
            Click Edit on any tile to refine that specific variant in the Refinement Studio.
            Horizontal and stacked reflow need tagged symbol + wordmark groups — Phase 12.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {variants?.map((v) => {
            const bg = BACKGROUNDS[v.id];
            return (
              <div
                key={v.id}
                className="group rounded-lg border border-border bg-card overflow-hidden"
              >
                <div
                  className={cn(
                    'relative aspect-square flex items-center justify-center',
                    bg === 'repeating' &&
                      'bg-[image:linear-gradient(45deg,#e5e7eb_25%,transparent_25%),linear-gradient(-45deg,#e5e7eb_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e5e7eb_75%),linear-gradient(-45deg,transparent_75%,#e5e7eb_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0]',
                  )}
                  style={bg !== 'repeating' && bg ? { backgroundColor: bg } : undefined}
                >
                  {v.doc ? (
                    <div
                      className="w-3/4 h-3/4 flex items-center justify-center"
                      dangerouslySetInnerHTML={{ __html: v.doc.svg }}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">Unavailable</span>
                  )}
                  <Button
                    asChild
                    size="sm"
                    variant="secondary"
                    className="absolute top-2 right-2 h-7 gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Link to={`/logo-maker/editor/${logoId}?variant=${v.id}`}>
                      <Pencil className="w-3 h-3" />
                      Edit
                    </Link>
                  </Button>
                </div>
                <div className="px-3 py-2 border-t border-border flex items-center justify-between">
                  <span className="text-xs font-medium truncate">{v.label}</span>
                  <code className="text-[10px] text-muted-foreground font-mono">{v.id}</code>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <footer className="sticky bottom-0 bg-background/80 backdrop-blur border-t border-border">
        <div className="max-w-[1280px] mx-auto flex items-center justify-between px-6 py-4">
          <Button asChild variant="ghost" className="gap-2">
            <Link to={`/logo-maker/editor/${logoId}`}>
              <ArrowLeft className="w-4 h-4" />
              Back to editor
            </Link>
          </Button>
          <Button
            onClick={() => navigate(`/logo-maker/brand-kit/${logoId}`)}
            className="gap-2"
          >
            Continue to brand kit
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </footer>
    </div>
  );
}

// Resolve the IdentitySystem for this route. In Phase 11 we bootstrap one
// on-the-fly from the Zustand store if none exists — so users coming from
// the existing Editor without an explicit Identity creation still get a
// variant view. Phase 13 replaces this with a real Supabase load.
function useResolveSystem(logoId: string): IdentitySystem | null {
  const brief = useLogoMakerStore((s) => s.brief);
  const editedSVG = useLogoMakerStore((s) => s.editedSVG);
  const [system, setSystem] = useState<IdentitySystem | null>(null);

  useEffect(() => {
    // Reuse the editor draft if this logoId already has one.
    const editorDraft = localStorage.getItem(draftKey(logoId));
    const svg = editorDraft ?? editedSVG ?? null;

    // Try to find an existing Identity tied to this logoId in storage first.
    const existing = identityEngine
      .list()
      .find((s) => s.id === `idn_${logoId}` || s.id === logoId);
    if (existing) {
      setSystem(existing);
      return;
    }

    // Bootstrap a fresh system. Phase 13 will reuse IDs once Supabase persists
    // them; for now we key by a deterministic id so revisits find the same one.
    const fresh = identityEngine.create(brief, 'craft', { mode: 'external' });
    if (svg) {
      const updated = identityEngine.updatePrimary(fresh.id, svg);
      setSystem(updated ?? fresh);
    } else {
      setSystem(fresh);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logoId]);

  return system;
}
