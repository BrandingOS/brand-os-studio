/**
 * InnerNavRail — reusable in-page contextual navigation card.
 *
 * This is the pattern that lives INSIDE a page's content area (alongside
 * AppRail and BrandNavbar, not replacing them). It's a sticky card with
 * grouped items: in-page anchors that smooth-scroll to a section, and
 * route links that navigate to other pages WHILE STAYING in the same shell.
 *
 * Pages that want this pattern:
 *
 *   <BrandLayout maxWidth="7xl">
 *     ...optional sticky page header...
 *     <div className="flex gap-6">
 *       <InnerNavRail
 *         title="Guidelines"
 *         icon={BookOpen}
 *         storageKey="brandos:guidelines-nav-open"
 *         activeAnchor={activeAnchor}
 *         groups={[
 *           { id: 'sections', label: 'On this page', items: [...] },
 *           { id: 'editors',  label: 'Deep editors', items: [...] },
 *         ]}
 *       />
 *       <div className="min-w-0 flex-1 space-y-14 pb-12">
 *         <div id="section-strategy" className="scroll-mt-32">...</div>
 *         <div id="section-logo"     className="scroll-mt-32">...</div>
 *         ...
 *       </div>
 *     </div>
 *   </BrandLayout>
 *
 * Visual chrome (220px sticky card, collapsible to a 32px handle, header
 * with title icon + collapse button) is identical to the original
 * `BrandKitInnerNav` so this is a drop-in pattern across pages.
 *
 * Each instance owns a `storageKey` so its collapsed state persists
 * independently per page.
 */
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InnerNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /**
   * Hash anchor for in-page jump. The component looks for an element with
   * id `section-{anchor}` and smooth-scrolls to it. Mutually exclusive with
   * `href`.
   */
  anchor?: string;
  /**
   * Route href for page navigation. Used for "deep editor" links that take
   * the user to another page that should still be inside the same shell.
   * Mutually exclusive with `anchor`.
   */
  href?: string;
  badge?: string;
}

export interface InnerNavGroup {
  id: string;
  label: string;
  items: InnerNavItem[];
}

interface InnerNavRailProps {
  /** Header title shown in the card chrome — e.g. "Brand Kit", "Guidelines". */
  title: string;
  /** Icon shown next to the title and on the collapsed handle. */
  icon: React.ComponentType<{ className?: string }>;
  /** Item groups, rendered top-to-bottom with separators between them. */
  groups: InnerNavGroup[];
  /**
   * Currently in-view section id (the part after `section-`). Used to
   * highlight the active anchor item. Pair with `useActiveAnchor`.
   */
  activeAnchor?: string;
  /**
   * Unique localStorage key for the collapsed state, e.g.
   * `brandos:guidelines-nav-open`. Each page should pass its own key.
   */
  storageKey: string;
}

export function InnerNavRail({
  title,
  icon: TitleIcon,
  groups,
  activeAnchor,
  storageKey,
}: InnerNavRailProps) {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState<boolean>(() => {
    try {
      const v = localStorage.getItem(storageKey);
      return v === null ? true : v === '1';
    } catch {
      return true;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem(storageKey, open ? '1' : '0');
    } catch {
      /* noop */
    }
  }, [open, storageKey]);

  const handleAnchor = (anchor: string) => {
    const el = document.getElementById(`section-${anchor}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      try {
        history.replaceState(null, '', `#${anchor}`);
      } catch {
        /* noop */
      }
    }
  };

  // Collapsed handle (32px rail) — keeps the rail accessible without
  // hogging horizontal space when the user wants the content to breathe.
  if (!open) {
    return (
      <aside className="sticky top-32 flex h-fit flex-col items-center">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group flex w-8 flex-col items-center gap-2 rounded-r-2xl border border-l-0 border-border bg-card py-3 shadow-sm transition hover:border-primary/40 hover:bg-card/80"
          aria-label={`Show ${title} navigation`}
          title="Show navigation"
        >
          <PanelLeftOpen className="h-4 w-4 text-muted-foreground transition group-hover:text-foreground" />
          <span
            className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground"
            style={{ writingMode: 'vertical-rl' }}
          >
            {title}
          </span>
          <TitleIcon className="h-3 w-3 text-primary" />
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
            <TitleIcon className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {title}
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

        {/* Groups */}
        <nav className="p-2">
          {groups.map((group, gi) => (
            <React.Fragment key={group.id}>
              {gi > 0 && <div className="my-2 border-t border-border" />}
              <h4 className="px-2 pb-1 pt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
                {group.label}
              </h4>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isAnchor = !!item.anchor;
                  const isActive = isAnchor && activeAnchor === item.anchor;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => {
                          if (item.anchor) handleAnchor(item.anchor);
                          else if (item.href) navigate(item.href);
                        }}
                        className={cn(
                          'group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-xs transition',
                          isActive
                            ? 'bg-primary/10 font-semibold text-foreground'
                            : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                        )}
                      >
                        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                            {item.badge}
                          </span>
                        )}
                        {isActive && !item.badge && (
                          <ChevronRight className="ml-auto h-3 w-3" />
                        )}
                        {!isActive && !item.badge && item.href && (
                          <ChevronRight className="ml-auto h-3 w-3 opacity-0 transition group-hover:opacity-100" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </React.Fragment>
          ))}
        </nav>
      </div>
    </aside>
  );
}

/**
 * Hook to track which section is currently in view (used to highlight the
 * active item in the inner nav). Uses IntersectionObserver against elements
 * with id="section-{anchor}".
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
