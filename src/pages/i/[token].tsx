/**
 * A published Brand Identity at /i/:token — the page a stranger opens.
 *
 * Deliberately outside `ProtectedRoute`, and deliberately reading exactly ONE
 * row. A visitor has no session and no grant on anything; the publication
 * carries its own material inlined, so nothing here touches `brands`, the
 * Library, or storage. That is the whole point of the snapshot design — a
 * share link is a document, not a key.
 *
 * The brand inside the snapshot is in its legacy shape, so this renders through
 * the identical `BrandIdentityPage` the owner sees. Presence, ordering and
 * sentinel handling cannot drift between the two views because there is only
 * one implementation of them.
 */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useService } from '@/core';
import { SERVICE_KEYS } from '@/core/types/services';
import type { Brand } from '@/shared/types/brand';
import { BrandIdentityPage } from '@/features/brand-identity/BrandIdentityPage';
import type {
  Publication,
  PublicationRepository,
} from '@/features/brand-identity/publish/publicationRepository';
import '@/features/brand-identity/identity.css';

export default function PublishedIdentityRoute() {
  const { token } = useParams<{ token: string }>();
  const repo = useService<PublicationRepository>(SERVICE_KEYS.IDENTITY_PUBLICATIONS);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [publication, setPublication] = useState<Publication | null>(null);

  useEffect(() => {
    if (!token) {
      setState('missing');
      return;
    }
    let alive = true;
    void repo
      .byToken(token)
      .then((found) => {
        if (!alive) return;
        setPublication(found);
        setState(found ? 'ready' : 'missing');
      })
      .catch(() => {
        if (alive) setState('missing');
      });
    return () => {
      alive = false;
    };
  }, [repo, token]);

  if (state === 'loading') {
    return (
      <div className="bi-public-state">
        <p>Loading…</p>
      </div>
    );
  }

  if (state === 'missing' || !publication) {
    /*
     * One message for "never existed" and for "revoked", on purpose.
     *
     * Distinguishing them would tell anyone guessing tokens which of their
     * guesses had once been real, and tells a legitimate visitor nothing they
     * can act on either way.
     */
    return (
      <div className="bi-public-state">
        <h1>This link isn’t available</h1>
        <p>It may have been revoked, or it may never have existed.</p>
      </div>
    );
  }

  const { snapshot } = publication;
  return (
    <BrandIdentityPage
      brand={snapshot.brand as unknown as Brand}
      images={snapshot.images}
      assetGroups={snapshot.assetGroups}
      mode="public"
    />
  );
}
