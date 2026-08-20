/**
 * ToolGate — the universal "this needs an account" gate.
 *
 * Wraps any action that should be free in in-app mode but signup-gated
 * in public mode. Two usage patterns:
 *
 *   <ToolGate
 *     mode={mode}
 *     feature="export-svg"
 *     gates={gates}
 *     onAllowed={handleExport}
 *   >
 *     {(trigger) => <Button onClick={trigger}>Export SVG</Button>}
 *   </ToolGate>
 *
 * The gate calls `onAllowed` immediately when the feature is `'free'`
 * or the user is signed in; otherwise it pops the GateModal which routes
 * the user through signup and then continues the original action.
 */
import { useCallback, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSessionStore } from '@/shared/store/sessionStore';
import type { GateMap, ToolFeature, ToolMode, ToolSlug } from './types';

interface ToolGateProps {
  mode: ToolMode;
  feature: ToolFeature;
  gates: GateMap;
  slug: ToolSlug;
  /** Called when the action is allowed (free, or after successful signup). */
  onAllowed: () => void;
  /** Render-prop receives the trigger to attach to your control. */
  children: (trigger: () => void) => ReactNode;
  /** Friendly description shown in the gate modal. */
  ctaLabel?: string;
}

const FEATURE_COPY: Record<ToolFeature, { title: string; body: string }> = {
  'export-png-1x': {
    title: 'Export PNG',
    body: 'Quick PNG exports are free. Sign up to unlock @2x and @3x.',
  },
  'export-png-2x': {
    title: 'Export @2x PNG',
    body: 'High-resolution exports are part of the free account. Sign up to continue — your work is saved.',
  },
  'export-png-3x': {
    title: 'Export @3x PNG',
    body: 'Print-ready resolution unlocks with a free account. Your variants are saved.',
  },
  'export-svg': {
    title: 'Export SVG',
    body: 'Vector exports are part of a free account. Sign up to download — your work continues exactly where you left off.',
  },
  'export-pdf': {
    title: 'Export PDF',
    body: 'PDF exports unlock with a free account. Your variants are saved.',
  },
  'export-kit': {
    title: 'Export the full kit',
    body: 'The bulk variant kit (all formats, all variants, naming-convention-ready) is part of a free account.',
  },
  'export-typescale': {
    title: 'Export typescale',
    body: 'Sign up to copy the CSS, Tailwind, and design token exports — your scale is saved to a new brand.',
  },
  'save-session': {
    title: 'Save your work',
    body: 'Create a free account to save this session as a brand. Your variants will be waiting for you on the other side.',
  },
  'add-custom-color': {
    title: 'Add more custom colors',
    body: 'Free accounts get unlimited custom colors. This one is on the house — sign up for the rest.',
  },
  'add-extra-variant': {
    title: 'Keep more variants',
    body: 'Free accounts hold unlimited variants in a session. Sign up to keep building.',
  },
  'mockup-premium': {
    title: 'Premium mockups',
    body: 'Mockups (business card, t-shirt, web header, app icon) are part of a free account.',
  },
};

export function ToolGate({
  mode,
  feature,
  gates,
  slug,
  onAllowed,
  children,
  ctaLabel,
}: ToolGateProps) {
  const requirement = gates[feature] ?? 'free';
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const trigger = useCallback(() => {
    // In-app mode is never gated.
    if (mode === 'in-app' || requirement === 'free' || isAuthenticated) {
      onAllowed();
      return;
    }
    setOpen(true);
  }, [mode, requirement, isAuthenticated, onAllowed]);

  const handleSignup = useCallback(() => {
    setOpen(false);
    // Carry the intent through signup. After auth, the claim flow runs
    // and the user lands inside their new brand.
    const next = encodeURIComponent(`/claim?slug=${slug}&feature=${feature}`);
    navigate(`/?signup=1&next=${next}`);
  }, [navigate, slug, feature]);

  const copy = FEATURE_COPY[feature];

  return (
    <>
      {children(trigger)}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-center">{copy.title}</DialogTitle>
            <DialogDescription className="text-center">{copy.body}</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Free account includes
            </div>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
              <li>SVG, PDF, and high-resolution PNG exports</li>
              <li>Unlimited variants and custom colors</li>
              <li>Bulk kit export with naming conventions</li>
              <li>Your work saved as a real brand in BrandingOS</li>
            </ul>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Not now
            </Button>
            <Button onClick={handleSignup}>{ctaLabel ?? 'Create free account'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
