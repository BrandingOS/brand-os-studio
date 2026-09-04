/**
 * The owner's way into the Bento maker, from the identity document.
 *
 * ── Why a launcher and not a section ─────────────────────────────────────
 *
 * The Applied section already carries a bento — `BentoWall` in
 * `sections/Surfaces.tsx` — but that is a different thing wearing the same
 * name. It is a PROOF surface: the identity applied to a bento layout,
 * generated from the model and painted in the page's own register, and it
 * belongs to this document. `features/bento` is a MAKER: the owner composes a
 * graphic and exports a PNG. Rendering the maker's output here as well would
 * put two bentos on one page, which is the duplication this integration exists
 * to avoid.
 *
 * So the identity page keeps its bento and OFFERS the maker. One Bento
 * implementation, reached from here.
 *
 * ── Why it is safe on the public page ────────────────────────────────────
 *
 * It is not on the public page. `BrandIdentityPage` renders `actions` only
 * where the mount supplies them, and the public mount (`pages/i/[token].tsx`)
 * supplies none — so this cannot leak an owner control into a shared link by
 * being forgotten. There is deliberately no `mode` check here: the mount is
 * the gate, and a second one would be a second place to get it wrong.
 */
import { Link } from 'react-router-dom';
import { useIdentityModel } from '../identityContext';

export function IdentityBentoAction() {
  const model = useIdentityModel();
  const slug = model?.brand?.slug;
  // No slug, no destination. A launcher that navigates nowhere is worse than
  // no launcher — this is the same reason the share control returns null.
  if (!slug) return null;

  return (
    <Link className="bi-nav-launch" to={`/b/${slug}/bento`} title="Compose a bento graphic from this brand">
      Bento
    </Link>
  );
}

export default IdentityBentoAction;
