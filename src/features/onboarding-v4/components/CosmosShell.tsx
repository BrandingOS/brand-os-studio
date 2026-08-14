import { type ReactNode } from 'react';
import '../styles/cosmos.css';
import '@/shared/styles/workspace.css';
import { ThemeToggle } from './ThemeToggle';
import { useCosmosTheme } from './useCosmosTheme';

interface Props {
  variant?: 'setup' | 'create';
  children: ReactNode;
}

/** Scoped cosmos wrapper — drives local light/dark via data-theme, renders the fixed theme toggle. */
export function CosmosShell({ variant = 'setup', children }: Props) {
  const [theme, toggle] = useCosmosTheme();
  return (
    <div data-onboarding="cosmos" data-theme={theme} className="min-h-screen">
      <ThemeToggle onToggle={toggle} />
      <main className={variant === 'setup' ? 'page' : 'page page-create'}>{children}</main>
    </div>
  );
}
