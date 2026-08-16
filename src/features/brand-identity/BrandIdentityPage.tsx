/**
 * The Brand Identity page.
 *
 * One component, two mounts: inside Studio at `/b/:slug/identity`, where the
 * owner sees it with share controls, and publicly, where it is the same page
 * with the controls gone. `mode` is the only difference — a second
 * implementation for the public view would drift from this one within a month,
 * and the whole promise is that what you share is what you saw.
 *
 * Read-only by construction. Editing lives in Setup and the Brand Kit; this
 * page renders the brand and hands pieces of it out, and never writes.
 */
import { useEffect, useMemo, type ReactNode } from 'react';
import type { Brand } from '@/shared/types/brand';
import { bgTone } from '@/shared/brand/logoOnBackground';
import { buildIdentityModel, presentSections, type BuildIdentityInput } from './identityModel';
import { IdentityNav } from './components/IdentityNav';
import { IdentityHero, Introduction, Personality, Purpose } from './sections/Narrative';
import './identity.css';

export interface BrandIdentityPageProps extends BuildIdentityInput {
  brand: Brand;
  /** `studio` adds the owner's controls. `public` is the shared page. */
  mode?: 'studio' | 'public';
  /** Owner-only actions, rendered into the nav card. */
  actions?: ReactNode;
}

export function BrandIdentityPage({
  brand,
  images,
  assetGroups,
  mode = 'studio',
  actions,
}: BrandIdentityPageProps) {
  const model = useMemo(
    () => buildIdentityModel({ brand, images, assetGroups }),
    [brand, images, assetGroups],
  );
  const sections = useMemo(() => presentSections(model), [model]);

  /*
   * The brand's colour, injected as a token rather than threaded through props.
   *
   * Everything that wants the accent — a dot, an emphasised word, a pill, the
   * two full-ground sections — reads `--bi-accent`, so the takeover is one
   * declaration instead of forty. The lead colour is the brand's OWN primary,
   * and `bgTone` picks the ink that reads on it; guessing white would put white
   * on a pale yellow brand.
   */
  const lead = model.colour.colours.find((c) => c.lead)?.hex;
  const style = useMemo(() => {
    if (!lead) return undefined;
    return {
      '--bi-accent': lead,
      '--bi-on-accent': bgTone(lead) === 'dark' ? '#FFFFFF' : '#111113',
    } as React.CSSProperties;
  }, [lead]);

  // The document belongs to the brand while this page is open.
  useEffect(() => {
    if (mode !== 'public') return;
    const previous = document.title;
    document.title = `${model.name} — Brand identity`;
    return () => {
      document.title = previous;
    };
  }, [mode, model.name]);

  return (
    <div data-identity data-mode={mode} style={style}>
      <IdentityNav brandName={model.name} sections={sections} actions={actions} />

      <main>
        <IdentityHero model={model} />
        {model.introduction.present && <Introduction model={model} />}
        {model.purpose.present && <Purpose model={model} />}
        {model.personality.present && <Personality model={model} />}
      </main>
    </div>
  );
}

export default BrandIdentityPage;
