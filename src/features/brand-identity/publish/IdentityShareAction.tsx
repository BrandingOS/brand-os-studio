/**
 * The owner's share control, resolved against the model the page built.
 *
 * A thin seam so the route does not have to build the identity model twice:
 * `BrandIdentityPage` already has it, and hands it down through a context that
 * exists for exactly this — owner-only actions that need to know what is on
 * the page.
 */
import { useIdentityModel } from '../identityContext';
import { ShareControl } from './ShareControl';

export function IdentityShareAction() {
  const model = useIdentityModel();
  if (!model) return null;
  return <ShareControl model={model} />;
}

export default IdentityShareAction;
