/**
 * Publishing the page, and saying honestly where the link goes.
 *
 * The whole control turns on one thing: a link that does not leave this
 * browser must never look like one that does. That is the failure mode worth
 * designing against — the owner copies a URL, sends it to a client, and the
 * client sees nothing. So `reach` is stated in words next to the link, not
 * inferred from a subtle colour.
 */
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useService } from '@/core';
import { SERVICE_KEYS } from '@/core/types/services';
import type { IdentityModel } from '../identityModel';
import { buildSnapshot } from './snapshot';
import type { Publication, PublicationRepository } from './publicationRepository';

export function shareUrl(token: string): string {
  return `${window.location.origin}/i/${token}`;
}

export function ShareControl({ model }: { model: IdentityModel }) {
  const repo = useService<PublicationRepository>(SERVICE_KEYS.IDENTITY_PUBLICATIONS);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [publication, setPublication] = useState<Publication | null>(null);

  useEffect(() => {
    let alive = true;
    void repo.forBrand(model.brand.id).then((p) => {
      if (alive) setPublication(p);
    });
    return () => {
      alive = false;
    };
  }, [repo, model.brand.id]);

  const publish = async () => {
    setBusy(true);
    try {
      // Built from the model the owner is looking at, so what gets published
      // is what they just read — not a re-derivation that could differ.
      const snapshot = await buildSnapshot(model);
      const next = await repo.publish({
        brandId: model.brand.id,
        brandName: model.name,
        snapshot,
        ...(publication?.token ? { token: publication.token } : {}),
      });
      setPublication(next);
      if (snapshot.omitted.length) {
        // Never report a clean publish for something that lost material.
        toast.warning(`${snapshot.omitted.length} file(s) were too large to include`, {
          description: snapshot.omitted.slice(0, 3).join(', '),
        });
      } else {
        toast.success(publication ? 'Share link updated' : 'Published');
      }
    } catch {
      toast.error("Couldn't publish just now. Nothing was shared — try again.");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    setBusy(true);
    try {
      await repo.unpublish(model.brand.id);
      setPublication(null);
      toast.success('Link revoked');
    } catch {
      toast.error("Couldn't revoke just now.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!publication) return;
    try {
      await navigator.clipboard.writeText(shareUrl(publication.token));
      toast.success('Link copied');
    } catch {
      /* clipboard refused — the url is on screen and selectable */
    }
  };

  return (
    <span className="bi-share">
      <button
        type="button"
        className="bi-share-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {publication ? 'Shared' : 'Share'}
      </button>

      {open && (
        <div className="bi-share-panel" role="dialog" aria-label="Share this page">
          {publication ? (
            <>
              <p className="bi-share-reach" data-reach={publication.reach}>
                {publication.reach === 'everyone'
                  ? 'Anyone with this link can view this page.'
                  : 'This link only works in this browser — publishing to the web needs the identity publications table deployed.'}
              </p>
              <input
                className="bi-share-url"
                readOnly
                value={shareUrl(publication.token)}
                onFocus={(e) => e.currentTarget.select()}
                aria-label="Share link"
              />
              <div className="bi-share-actions">
                <button type="button" onClick={() => void copy()}>
                  Copy link
                </button>
                <button type="button" onClick={() => void publish()} disabled={busy}>
                  {busy ? 'Updating…' : 'Update'}
                </button>
                <button type="button" data-danger onClick={() => void revoke()} disabled={busy}>
                  Revoke
                </button>
              </div>
              <p className="bi-share-note">
                A share is a snapshot. Changes to the brand appear here only when you press
                Update.
              </p>
            </>
          ) : (
            <>
              <p className="bi-share-note">
                Publishing takes a copy of this page as it looks now and gives it its own link.
                The brand stays private; only the copy is shared.
              </p>
              <div className="bi-share-actions">
                <button type="button" onClick={() => void publish()} disabled={busy}>
                  {busy ? 'Publishing…' : 'Publish'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </span>
  );
}

export default ShareControl;
