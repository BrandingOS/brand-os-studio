import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { OptimizedDesignEditor } from './OptimizedDesignEditor';
import { WelcomeTutorial } from './WelcomeTutorial';
import { useBrandStore } from '@/shared/store/brandStore';

interface EditorShellProps {
  moduleId?: string;
  brandId?: string;
  brandSlug?: string;
}

export function EditorShell({ moduleId, brandId, brandSlug }: EditorShellProps) {
  const { current: brand, loadBySlug, loadAll, list, isLoading } = useBrandStore();
  const [showTutorial, setShowTutorial] = useState(false);
  const { setTheme } = useTheme();

  const identifier = brandSlug || brandId;

  // Theme continuity (SHL-02): the Studio workspace theme lives in
  // `brandos-theme` and is scoped to [data-workspace] — this editor
  // route has no workspace wrapper, so it rendered the app default
  // (light) even inside a dark session, flashing full-brightness on
  // entry. Mirror the workspace preference into next-themes while the
  // editor is mounted; restore the app default on exit.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem('brandos-theme');
    } catch {
      // Storage unavailable — keep the default.
    }
    if (stored === 'dark') setTheme('dark');
    return () => {
      if (stored === 'dark') setTheme('light');
    };
  }, [setTheme]);

  useEffect(() => {
    if (!identifier) return;

    // Try to find in store first (fast, works offline)
    const fromStore = list.find(b => b.slug === identifier || b.id === identifier);
    if (fromStore) {
      useBrandStore.getState().setCurrent(fromStore);
    } else {
      // Load all brands then find by slug
      if (list.length === 0) {
        loadAll().catch(console.error);
      }
      loadBySlug(identifier).catch(console.error);
    }

    // Tutorial check
    const tutorialKey = `editor-tutorial-${identifier}`;
    if (!localStorage.getItem(tutorialKey)) {
      setShowTutorial(true);
    }
  }, [identifier]);

  const handleCloseTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem(`editor-tutorial-${identifier}`, 'seen');
  };

  if (!identifier) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Brand ID Required</h2>
          <p className="text-muted-foreground">Please provide a brand ID to access the editor.</p>
        </div>
      </div>
    );
  }

  if (isLoading && !brand) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Brand Not Found</h2>
          <p className="text-muted-foreground">Could not load brand "{identifier}".</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <OptimizedDesignEditor brand={brand} brandId={brand.id || identifier!} />
      {showTutorial && (
        <WelcomeTutorial
          onClose={handleCloseTutorial}
          brandName={brand.name}
        />
      )}
    </>
  );
}
