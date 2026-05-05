// BrandPicker — top-bar dropdown for switching brands and re-applying
// the current brand kit.
//
// Step 5b. Pulls brands from `IBrandsService` via the DI container so
// the dropdown shows the user's real brand list. Selecting a different
// brand fires `onBrandSwitch(slug)`. A separator + "Re-apply brand kit"
// item below the list calls `onReapplyBrand`.
//
// Brand switching is fully wired in Phase 4.5 (canonical
// `/b/:brandSlug/design/:designSlug` route). The parent component is
// responsible for handling brand changes via this callback — the dev
// harness reloads a fixture for visual verification; route handlers
// will navigate to the brand-scoped URL instead.

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Loader2, RefreshCw } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useService, SERVICE_KEYS } from '@/core';
import type { IBrandsService } from '@/core';
import type { Brand } from '@/shared/types/brand';

interface Props {
  /** Current brand. Optional — when undefined, the picker shows a
   *  placeholder mark and the dropdown still lists available brands. */
  brand?: Brand;
  /**
   * Fired when the user picks a brand other than the current one.
   * The slug is the canonical identifier used by route handlers
   * (Phase 4.5) and IBrandsService.getBySlug.
   */
  onBrandSwitch?: (slug: string) => void;
  /**
   * Fired when the user picks "Re-apply brand kit". The Editor's
   * parent wires this to applyBrandToDocument(doc, kit,
   * { respectLocks: true }) inside adapter.batch.
   */
  onReapplyBrand?: () => void;
}

export function BrandPicker({ brand, onBrandSwitch, onReapplyBrand }: Props) {
  const initial = useMemo(() => {
    if (!brand?.name) return '?';
    return brand.name.charAt(0).toUpperCase();
  }, [brand?.name]);

  const markBg = brand?.colorSystem?.primary?.hex ?? brand?.primaryColor ?? '#0d0d0d';
  const displayName = brand?.name ?? 'Untitled brand';

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="top-nav-brand"
          aria-label={`Switch brand. Current: ${displayName}`}
          data-brand-picker-trigger
          style={{
            background: 'transparent',
            border: 'none',
            padding: '4px 8px 4px 4px',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          <span
            className="top-nav-brand-mark"
            aria-hidden="true"
            style={{ background: markBg, color: '#fff' }}
          >
            {initial}
          </span>
          <span>{displayName}</span>
          <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        {/* Radix portals the Content under document.body — OUTSIDE
            the editor's `[data-workspace]` wrapper. CSS
            vars defined on that scope (`--surface-elevated` etc.)
            don't resolve here, so the dropdown previously rendered
            transparent. Re-establish the cosmos var scope on the
            Content itself so the entire item tree resolves: every
            child still uses `var(--surface-hover)`, `var(--border)`,
            etc., and we don't have to thread fallbacks down to each
            item. Documented in CLAUDE.md "Radix Portal + scoped CSS". */}
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 min-w-[260px] rounded-xl p-1.5"
          data-workspace
          data-brand-picker-content
          style={{
            background: 'var(--surface-elevated, #ffffff)',
            border: '1px solid var(--border, rgba(13, 13, 13, 0.12))',
            boxShadow: 'var(--shadow-md, 0 4px 16px rgba(0, 0, 0, 0.10))',
            color: 'var(--text-primary, #0d0d0d)',
          }}
        >
          <BrandList
            currentBrandId={brand?.id}
            onBrandSwitch={(slug) => {
              if (slug !== brand?.slug) onBrandSwitch?.(slug);
            }}
          />
          <DropdownMenu.Separator
            className="my-1 h-px"
            style={{ background: 'var(--border)' }}
          />
          <DropdownMenu.Item
            data-action="reapply-brand"
            disabled={!brand || !onReapplyBrand}
            onSelect={() => onReapplyBrand?.()}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 outline-none transition-colors"
            style={{
              color: brand && onReapplyBrand ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
            onMouseEnter={(e) => {
              if (brand && onReapplyBrand)
                e.currentTarget.style.background = 'var(--surface-hover)';
            }}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <RefreshCw size={13} />
            <span className="text-sm">Re-apply brand kit</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// ─── Brand list — lazy-fetched on dropdown mount ───────────────────────

function BrandList({
  currentBrandId,
  onBrandSwitch,
}: {
  currentBrandId?: string;
  onBrandSwitch: (slug: string) => void;
}) {
  const service = useService<IBrandsService>(SERVICE_KEYS.BRANDS);
  const [state, setState] = useState<
    | { kind: 'loading' }
    | { kind: 'ready'; brands: Brand[] }
    | { kind: 'error'; message: string }
  >({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const brands = await service.list();
        if (!cancelled) setState({ kind: 'ready', brands });
      } catch (e) {
        if (!cancelled)
          setState({
            kind: 'error',
            message: e instanceof Error ? e.message : 'Failed to load brands',
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [service]);

  if (state.kind === 'loading') {
    return (
      <div
        className="flex items-center gap-2 rounded-lg px-2 py-3 text-[11px]"
        style={{ color: 'var(--text-muted)' }}
        data-brand-list="loading"
      >
        <Loader2 size={12} className="animate-spin" />
        Loading brands…
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <p
        className="px-2 py-2 text-[11px]"
        style={{ color: 'var(--critical)' }}
        data-brand-list="error"
      >
        Couldn’t load brands: {state.message}
      </p>
    );
  }

  if (state.brands.length === 0) {
    return (
      <p
        className="px-2 py-2 text-[11px]"
        style={{ color: 'var(--text-muted)' }}
        data-brand-list="empty"
      >
        No brands yet. Create one from the dashboard.
      </p>
    );
  }

  return (
    <>
      <p
        className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider"
        style={{ color: 'var(--text-muted)' }}
      >
        Switch brand
      </p>
      <div data-brand-list="ready">
        {state.brands.map((b) => {
          const isCurrent = b.id === currentBrandId;
          const markBg = b.colorSystem?.primary?.hex ?? b.primaryColor ?? '#0d0d0d';
          return (
            <DropdownMenu.Item
              key={b.id}
              data-brand-slug={b.slug}
              data-brand-current={isCurrent ? 'true' : 'false'}
              onSelect={() => onBrandSwitch(b.slug)}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 outline-none transition-colors"
              style={{
                background: isCurrent ? 'var(--accent-muted)' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!isCurrent)
                  e.currentTarget.style.background = 'var(--surface-hover)';
              }}
              onMouseLeave={(e) => {
                if (!isCurrent) e.currentTarget.style.background = 'transparent';
              }}
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white"
                style={{ background: markBg, fontSize: 13, fontWeight: 600 }}
                aria-hidden
              >
                {b.name.charAt(0).toUpperCase()}
              </span>
              <span className="flex-1 text-sm">{b.name}</span>
              {isCurrent ? (
                <span
                  className="text-[10px]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  current
                </span>
              ) : null}
            </DropdownMenu.Item>
          );
        })}
      </div>
    </>
  );
}
