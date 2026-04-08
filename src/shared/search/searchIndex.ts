/**
 * Search index for the universal command palette.
 *
 * Composes from:
 *  - useBrandStore (live brands list)
 *  - Hardcoded route directory (workspace + brand pages)
 *  - Quick actions (create brand, open assistant, switch theme)
 *  - Templates (from brandkit/data/templates if available, else stub)
 */
import * as React from 'react';
import { useBrandStore } from '@/shared/store/brandStore';

export type SearchKind =
  | 'brand'
  | 'template'
  | 'page'
  | 'asset'
  | 'guideline'
  | 'setting'
  | 'action'
  | 'ai'
  | 'route'
  | 'create';

export interface SearchItem {
  id: string;
  kind: SearchKind;
  title: string;
  subtitle?: string;
  group?: string;
  icon?: string;
  href?: string;
  action?: () => void;
  keywords?: string[];
}

const WORKSPACE_PAGES: SearchItem[] = [
  { id: 'page:home', kind: 'page', title: 'Home', subtitle: 'Workspace overview', group: 'Pages', icon: 'route', href: '/dashboard', keywords: ['dashboard', 'workspace', 'home'] },
  { id: 'page:brands', kind: 'page', title: 'Brands', subtitle: 'All your brand systems', group: 'Pages', icon: 'brand', href: '/dashboard/brands', keywords: ['brands', 'list', 'library'] },
  { id: 'page:templates', kind: 'page', title: 'Templates', subtitle: 'Browse the template library', group: 'Pages', icon: 'template', href: '/dashboard/templates', keywords: ['templates', 'marketplace', 'designs'] },
  { id: 'page:learn', kind: 'page', title: 'Learn', subtitle: 'Tutorials and best practices', group: 'Pages', icon: 'guideline', href: '/learn', keywords: ['learn', 'help', 'tutorials', 'docs'] },
  { id: 'page:logo-maker', kind: 'page', title: 'Logo Maker', subtitle: 'Generate a logo from scratch', group: 'Pages', icon: 'create', href: '/dashboard/logo-maker', keywords: ['logo', 'generate', 'create'] },
  { id: 'page:activity', kind: 'page', title: 'Activity', subtitle: 'Recent edits and updates', group: 'Pages', icon: 'route', href: '/dashboard/activity', keywords: ['activity', 'feed', 'recent'] },
  { id: 'page:settings', kind: 'setting', title: 'Account settings', subtitle: 'Profile, billing, password', group: 'Settings', icon: 'setting', href: '/settings/account', keywords: ['settings', 'account', 'profile'] },
  { id: 'page:plans', kind: 'setting', title: 'Plans & billing', subtitle: 'Upgrade or change plan', group: 'Settings', icon: 'setting', href: '/settings/plans', keywords: ['billing', 'plans', 'upgrade', 'subscription'] },
];

const QUICK_ACTIONS: SearchItem[] = [
  { id: 'action:create-brand', kind: 'create', title: 'Create new brand', subtitle: 'Start the brand wizard', group: 'Actions', icon: 'create', href: '/onboarding', keywords: ['new', 'create', 'brand', 'wizard'] },
  { id: 'action:open-assistant', kind: 'ai', title: 'Open AI Brand Assistant', subtitle: 'Ask anything about your brand', group: 'Actions', icon: 'ai', action: () => window.dispatchEvent(new CustomEvent('brandos:open-assistant')), keywords: ['ai', 'assistant', 'chat', 'help'] },
  { id: 'action:toggle-theme', kind: 'action', title: 'Toggle theme', subtitle: 'Switch between dark and light', group: 'Actions', icon: 'action', action: () => {
    const root = document.documentElement;
    const isDark = root.classList.contains('dark');
    root.classList.toggle('dark', !isDark);
    try { localStorage.setItem('theme', isDark ? 'light' : 'dark'); } catch { /* noop */ }
  }, keywords: ['theme', 'dark', 'light', 'toggle'] },
];

function brandSubpages(slug: string, name: string): SearchItem[] {
  return [
    { id: `b:${slug}:overview`, kind: 'brand', title: name, subtitle: 'Open brand overview', group: 'Brands', icon: 'brand', href: `/b/${slug}`, keywords: [name, slug, 'brand', 'overview'] },
    { id: `b:${slug}:identity`, kind: 'brand', title: `${name} · Identity`, subtitle: 'Logo, colors, typography, voice', group: 'Brands', icon: 'brand', href: `/b/${slug}/identity`, keywords: [name, 'identity', 'logo', 'colors'] },
    { id: `b:${slug}:assets`, kind: 'asset', title: `${name} · Assets`, subtitle: 'Brand asset library', group: 'Brands', icon: 'asset', href: `/b/${slug}/assets`, keywords: [name, 'assets', 'dam', 'library'] },
    { id: `b:${slug}:guidelines`, kind: 'guideline', title: `${name} · Guidelines`, subtitle: 'Published brand book', group: 'Brands', icon: 'guideline', href: `/b/${slug}/guidelines`, keywords: [name, 'guidelines', 'brand book', 'rules'] },
    { id: `b:${slug}:share`, kind: 'brand', title: `${name} · Share`, subtitle: 'Share, export, public portal', group: 'Brands', icon: 'route', href: `/b/${slug}/share`, keywords: [name, 'share', 'export', 'public', 'portal'] },
  ];
}

/**
 * useSearchIndex — composes the live index for the command palette.
 * Re-runs whenever the brand list changes.
 */
export function useSearchIndex(): SearchItem[] {
  const brands = useBrandStore((s) => s.list);

  return React.useMemo(() => {
    const brandItems: SearchItem[] = [];
    for (const b of brands ?? []) {
      brandItems.push(...brandSubpages(b.slug, b.name));
    }
    return [
      ...QUICK_ACTIONS,
      ...brandItems,
      ...WORKSPACE_PAGES,
    ];
  }, [brands]);
}
