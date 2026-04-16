import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModeCard } from '../components/ModeCard';
import { MODES } from '../constants';
import { useLogoMakerStore } from '../state/useLogoMakerStore';
import type { CreationMode } from '../state/types';

// Mode Select — spec §3.2 Screen 1.
// Canvas skips straight to /editor; Upload skips to /upload (Phase 7).
// AI + Wizard both go to /brief?mode=X.
function routeForMode(mode: CreationMode): string {
  if (mode === 'canvas') return '/logo-maker/editor/blank';
  if (mode === 'upload') return '/logo-maker/upload';
  return `/logo-maker/brief?mode=${mode}`;
}

export default function ModeSelectScreen() {
  const navigate = useNavigate();
  const setMode = useLogoMakerStore((s) => s.setMode);
  const setScreen = useLogoMakerStore((s) => s.setScreen);

  const pick = (mode: CreationMode) => {
    setMode(mode);
    setScreen(2);
    navigate(routeForMode(mode));
  };

  // Keyboard: 1-4 select a mode. Ignore when focused inside an input/textarea.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      const match = MODES.find((m) => m.shortcut === e.key);
      if (match) {
        e.preventDefault();
        pick(match.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[900px]">
          <header className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              How do you want to build your logo?
            </h1>
            <p className="text-lg text-muted-foreground">
              Pick your path — you can switch anytime later.
            </p>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {MODES.map((mode) => (
              <ModeCard key={mode.id} mode={mode} onClick={() => pick(mode.id)} />
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-12">
            Everything you create is automatically saved as a brand in your dashboard.
          </p>
        </div>
      </main>
    </div>
  );
}
