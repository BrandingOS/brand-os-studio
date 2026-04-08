/**
 * BrandKitInnerNav — toggleable secondary navigation inside the Brand Kit
 * page. Lists every section in the page (in-page anchors) AND deep-links
 * to the legacy brandkit module editors that aren't yet inlined.
 *
 * Visual: a vertical list ~220px wide. When toggled off, collapses to a
 * 32px rail with just a chevron handle so the user can re-open it. State
 * is persisted to localStorage.
 *
 * Single source of nav for everything you can do inside the brand kit.
 */
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  Image as ImageIcon,
  Palette,
  Type,
  CreditCard,
  Instagram,
  Smile,
  Box,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Facebook,
  Square,
  Smartphone,
  Presentation,
  Play,
  QrCode,
  FileText,
  PenTool,
  Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'brandos:brandkit-nav-open';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Hash anchor (in-page jump) OR a path (external nav). One must be set. */
  anchor?: string;
  href?: string;
  badge?: string;
}

interface BrandKitInnerNavProps {
  slug: string;
  /** Current scrolled-into-view section id, for highlight. */
  activeAnchor?: string;
}

export function BrandKitInnerNav({ slug, activeAnchor }: BrandKitInnerNavProps) {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState<boolean>(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v === null ? true : v === '1';
    } catch {
      return true;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, open ? '1' : '0');
    } catch {
      /* noop */
    }
  }, [open]);

  // In-page sections (anchors)
  const sections: NavItem[] = [
    { id: 'settings', label: 'Settings', icon: Settings, anchor: 'settings' },
    { id: 'logo', label: 'Logo', icon: ImageIcon, anchor: 'logo' },
    { id: 'colors', label: 'Colors', icon: Palette, anchor: 'colors' },
    { id: 'typography', label: 'Typography', icon: Type, anchor: 'typography' },
    { id: 'stationery', label: 'Stationery', icon: CreditCard, anchor: 'stationery' },
    { id: 'social', label: 'Social & Screen', icon: Instagram, anchor: 'social' },
    { id: 'favicons', label: 'Favicons', icon: Smile, anchor: 'favicons' },
    { id: 'mockups', label: 'Mockups', icon: Box, anchor: 'mockups' },
    { id: 'brand-book', label: 'Brand book', icon: BookOpen, anchor: 'brand-book' },
  ];

  // Deep editors (route to legacy brandkit module pages)
  const editors: NavItem[] = [
    { id: 'brand-guides', label: 'Brand Guides', icon: BookOpen, href: `/dashboard/brand/${slug}/brand-guides` },
    { id: 'profile-icons', label: 'Profile Icons', icon: Smile, href: `/b/${slug}/brandkit/profile-icons` },
    { id: 'business-cards', label: 'Business Cards', icon: CreditCard, href: `/b/${slug}/brandkit/business-cards` },
    { id: 'facebook-covers', label: 'Facebook Covers', icon: Facebook, href: `/b/${slug}/brandkit/facebook-covers` },
    { id: 'instagram-posts', label: 'Instagram Posts', icon: Square, href: `/b/${slug}/brandkit/instagram-posts` },
    { id: 'instagram-stories', label: 'Instagram Stories', icon: Smartphone, href: `/b/${slug}/brandkit/instagram-stories` },
    { id: 'presentations', label: 'Presentations', icon: Presentation, href: `/b/${slug}/brandkit/presentations` },
    { id: 'animations', label: 'Animations', icon: Play, href: `/b/${slug}/brandkit/animations` },
    { id: 'qr-code', label: 'QR Code', icon: QrCode, href: `/b/${slug}/brandkit/qr-code` },
    { id: 'invoices', label: 'Invoices', icon: FileText, href: `/b/${slug}/brandkit/invoices` },
    { id: 'design-tool', label: 'Design Tool', icon: PenTool, href: `/b/${slug}/brandkit/design-tool` },
  ];

  const handleAnchor = (anchor: string) => {
    const el = document.getElementById(`section-${anchor}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Update the URL hash without a router navigation
      try {
        history.replaceState(null, '', `#${anchor}`);
      } catch {
        /* noop */
      }
    }
  };

  // Collapsed handle (32px rail)
  if (!open) {
    return (
      <aside className="sticky top-32 flex h-fit flex-col items-center">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group flex w-8 flex-col items-center gap-2 rounded-r-2xl border border-l-0 border-border bg-card py-3 shadow-sm transition hover:border-primary/40 hover:bg-card/80"
          aria-label="Show brand kit navigation"
          title="Show navigation"
        >
          <PanelLeftOpen className="h-4 w-4 text-muted-foreground transition group-hover:text-foreground" />
          <span className="writing-mode-vertical text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground" style={{ writingMode: 'vertical-rl' }}>
            Brand Kit
          </span>
          <Wand2 className="h-3 w-3 text-primary" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="sticky top-32 h-fit w-[220px] flex-shrink-0">
      <div className="rounded-2xl border border-border bg-card">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Wand2 className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Brand Kit
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded p-1 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            aria-label="Hide navigation"
            title="Hide navigation"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </button>
        </header>

        {/* Sections list */}
        <nav className="p-2">
          <h4 className="px-2 pb-1 pt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
            On this page
          </h4>
          <ul className="space-y-0.5">
            {sections.map((item) => {
              const Icon = item.icon;
              const isActive = activeAnchor === item.anchor;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => item.anchor && handleAnchor(item.anchor)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-xs transition',
                      isActive
                        ? 'bg-primary/10 font-semibold text-foreground'
                        : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {isActive && <ChevronRight className="ml-auto h-3 w-3" />}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="my-2 border-t border-border" />

          <h4 className="px-2 pb-1 pt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
            Deep editors
          </h4>
          <ul className="space-y-0.5">
            {editors.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => item.href && navigate(item.href)}
                    className="group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
                  >
                    <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                    <ChevronRight className="ml-auto h-3 w-3 opacity-0 transition group-hover:opacity-100" />
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}

/**
 * Hook to track which section is currently in view (used for highlighting).
 * Uses IntersectionObserver against elements with id="section-{anchor}".
 */
export function useActiveAnchor(anchors: string[]): string | undefined {
  const [active, setActive] = React.useState<string | undefined>(anchors[0]);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          const id = visible[0].target.id.replace(/^section-/, '');
          setActive(id);
        }
      },
      {
        rootMargin: '-120px 0px -60% 0px',
        threshold: 0,
      },
    );

    const els = anchors
      .map((a) => document.getElementById(`section-${a}`))
      .filter((el): el is HTMLElement => !!el);
    els.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [anchors]);

  return active;
}
