/**
 * Full-page "brand not found" state for /b/:slug/* routes (NAV-01).
 *
 * Before this, an unknown slug rendered a completely blank page — the
 * route components returned `null` while the brand never resolved,
 * leaving the user stranded with no shell and no way back.
 */
import { Link } from 'react-router-dom';

export function BrandNotFoundPanel({
  slug,
  isLoading,
}: {
  slug?: string;
  isLoading?: boolean;
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'var(--background, #0c0c0d)',
        color: 'var(--foreground, #ededed)',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        {isLoading ? (
          <>
            <p style={{ fontSize: 15, opacity: 0.7 }}>Loading brand…</p>
          </>
        ) : (
          <>
            <p
              style={{
                fontSize: 12,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                opacity: 0.5,
                marginBottom: 12,
              }}
            >
              404 — Brand not found
            </p>
            <h1 style={{ fontSize: 26, fontWeight: 650, margin: '0 0 10px' }}>
              {slug ? `No brand matches “${slug}”` : 'No brand selected'}
            </h1>
            <p style={{ fontSize: 14.5, opacity: 0.65, margin: '0 0 24px' }}>
              It may have been renamed or deleted. Pick a brand from your
              workspace to continue.
            </p>
            <Link
              to="/dashboard"
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                borderRadius: 999,
                background: 'var(--foreground, #ededed)',
                color: 'var(--background, #0c0c0d)',
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Back to your brands
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
