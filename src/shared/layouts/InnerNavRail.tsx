/**
 * InnerNavRail — structural in-shell secondary navigation column.
 *
 * This is a layout column. It sits IMMEDIATELY next to AppRail (not floating
 * inside page content) and is mounted by BrandLayout when a page declares an
 * `innerNav` prop. There is exactly one of these per scope, and it is part of
 * the shell — never part of the page body.
 *
 * Layout context:
 *
 *   ┌────┬────────────┬─────────────────────────────────┐
 *   │    │            │  BrandNavbar                    │
 *   │ App│ InnerNav   │  ───────────────────────────────│
 *   │ Rail Rail (this)│  PageHeader                     │
 *   │    │            │  ───────────────────────────────│
 *   │    │            │  Page sections                  │
 *   └────┴────────────┴─────────────────────────────────┘
 *      88px    240px              flex-1
 *
 * Pages opt in by passing data to BrandLayout's `innerNav` prop. They never
 * mount this component directly. That keeps the shell consistent and stops
 * the rail from drifting into the middle of the canvas.
 *
 * Items can be either in-page anchors (smooth-scroll to `section-{anchor}`)
 * or route hrefs (navigate while staying in the same shell).
 */
import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
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

export interface InnerNavConfig {
  /** Header title shown in the column chrome — e.g. "Brand Kit", "Guidelines". */
  title: string;
  /** Icon shown next to the title. */
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
   * `brandos:guidelines-nav-open`. Each page must pass its own key.
   */
  storageKey: string;
}

interface InnerNavRailProps extends InnerNavConfig {}

/**
 * Renders the inner-nav column. Mounted by BrandLayout when a page declares
 * `innerNav`. Pages should not import this directly — pass `innerNav` to
 * BrandLayout instead.
 */
export function InnerNavRail({
  title,
  icon: TitleIcon,
  groups,
  activeAnchor,
  storageKey,
}: InnerNavRailProps) {
  const navigate = useNavigate();
  const location = useLocation();
  // Current full URL within the app, used to highlight active href items.
  // We compare against item.href so query-param-driven filters (like
  // /dam?category=logo) get an active state on the matching nav item.
  const currentUrl = location.pathname + (location.search || '');

  const [open, setOpen] = React.useState<boolean>(() => {
    try {
      const v = localStorage.getItem(storageKey);
      return v === null ? true : v === '1';
    } catch {
      return true;
    }
  });

  // Re-read collapsed state when storageKey changes. The rail is now part
  // of the persistent shell (BrandRouteLayout) and stays mounted across
  // brand-scope navigation, so when the user moves from one page to another
  // the storageKey prop changes but the component instance does not — we
  // need an effect to pick up the new key's value from localStorage.
  React.useEffect(() => {
    try {
      const v = localStorage.getItem(storageKey);
      setOpen(v === null ? true : v === '1');
    } catch {
      setOpen(true);
    }
  }, [storageKey]);

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

  // Collapsed state — narrow vertical handle, full-height column. Lets the
  // user reclaim canvas width without losing the rail entirely.
  if (!open) {
    return (
      <aside className="hidden lg:flex w-10 shrink-0 flex-col items-center justify-start border-r border-border/60 bg-muted/10 py-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group flex w-8 flex-col items-center gap-2 rounded-md py-3 transition hover:bg-muted/40"
          aria-label={`Show ${title} navigation`}
          title={`Show ${title}`}
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
    <aside
      aria-label={`${title} navigation`}
      className="hidden lg:flex w-60 shrink-0 flex-col border-r border-border/60 bg-muted/10"
    >
      {/* Header — title + collapse */}
      <header className="flex items-center justify-between px-4 pt-5 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <TitleIcon className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
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

      {/* Groups — own scroll for tall lists, doesn't move with main content */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {groups.map((group, gi) => (
          <React.Fragment key={group.id}>
            {gi > 0 && <div className="my-2 border-t border-border/60" />}
            <h4 className="px-2 pb-1 pt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
              {group.label}
            </h4>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isAnchor = !!item.anchor;
                // Anchor items: active when the anchor is in view.
                // Href items: active when the current URL exactly matches the
                // item's href (so filter pills like ?category=logo highlight
                // when the user lands on that filter view).
                const isActive = isAnchor
                  ? activeAnchor === item.anchor
                  : item.href
                    ? currentUrl === item.href
                    : false;
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
