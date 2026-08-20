import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useBrandStore } from '@/shared/store/brandStore';
import { rewriteBrandPath } from '@/shared/brand/brandPathRewrite';
import { BrandAvatar } from '@/shared/brand/BrandAvatar';
import type { Brand } from '@/shared/types/brand';

/**
 * Floating top-left pill: current brand mark + name + chevron.
 *
 * Click opens a dropdown with:
 *   - Dashboard link
 *   - BRANDS list (of the user's brands, with a check on the current)
 *   - Create new brand entry
 *
 * Drops into `WorkspaceShell`'s top-left slot. Reads from the
 * brand store (seed brands + localStorage + Supabase).
 */
export function BrandSwitcher({ currentSlug }: { currentSlug?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const list = useBrandStore((s) => s.list);
  const current = useBrandStore((s) => s.current);
  const loadAll = useBrandStore((s) => s.loadAll);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Ensure the brand list is populated so the dropdown has something
  // to render. Idempotent — the store guards against double-fetch.
  useEffect(() => {
    if (list.length === 0) void loadAll();
  }, [list.length, loadAll]);

  // Close on outside click / escape.
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const displayBrand = current?.slug === currentSlug ? current : list.find((b) => b.slug === currentSlug);
  const displayName = displayBrand?.name ?? 'BrandingOS';

  const handlePick = (brand: Brand) => {
    setOpen(false);
    if (brand.slug === currentSlug) return;
    navigate(rewriteBrandPath(location.pathname, currentSlug, brand.slug, location.search));
  };

  return (
    <div className="brand-switcher" ref={rootRef}>
      <button
        type="button"
        className={`brand-switcher-trigger${open ? ' is-open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {/* The brand's own mark, not its initial — `BrandAvatar` reaches for
            the Brand Icon, then the Primary logo, and only falls back to a
            letter when the brand truly has neither. */}
        <BrandAvatar brand={displayBrand} size={24} className="brand-switcher-mark" />
        <span className="brand-switcher-name">{displayName}</span>
        <svg
          className="brand-switcher-chevron"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="brand-switcher-menu" role="menu">
          <NavLink to="/dashboard" className="brand-switcher-row" onClick={() => setOpen(false)} role="menuitem">
            <span className="brand-switcher-row-icon" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
                <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
                <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
                <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </span>
            <span>Dashboard</span>
          </NavLink>

          <div className="brand-switcher-divider" aria-hidden="true" />
          <div className="brand-switcher-section-label">Brands</div>

          {list.map((brand) => {
            const active = brand.slug === currentSlug;
            return (
              <button
                type="button"
                key={brand.id}
                className={`brand-switcher-row${active ? ' is-active' : ''}`}
                onClick={() => handlePick(brand)}
                role="menuitem"
              >
                <BrandAvatar brand={brand} size={22} className="brand-switcher-row-mark" />
                <span className="brand-switcher-row-name">{brand.name}</span>
                {active && (
                  <svg
                    className="brand-switcher-row-check"
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 8.5L6.5 12L13 5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            );
          })}

          <div className="brand-switcher-divider" aria-hidden="true" />

          <NavLink to="/onboard-brand" className="brand-switcher-row" onClick={() => setOpen(false)} role="menuitem">
            <span className="brand-switcher-row-icon brand-switcher-row-icon--ghost" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
            <span>Create new brand</span>
          </NavLink>
        </div>
      )}
    </div>
  );
}

export default BrandSwitcher;
