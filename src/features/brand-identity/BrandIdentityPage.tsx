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
import { loadBrandFonts } from '@/shared/design-system/fonts';
import { buildIdentityModel, presentSections, type BuildIdentityInput } from './identityModel';
import { buildRegister } from './identityRegister';
import { IdentityModelContext, IdentityRegisterContext } from './identityContext';
import { IdentityNav } from './components/IdentityNav';
import { Glance, IdentityHero } from './sections/Hero';
import { Introduction, Personality, Purpose } from './sections/Narrative';
import { Colour, LogoSystem, LogoUsage, Typography } from './sections/System';
import {
  Assets,
  Closing,
  Downloads,
  Photography,
  SocialApplications,
  Voice,
} from './sections/Applications';
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
   * The register: the brand's colours, typefaces and section rhythm as one set
   * of custom properties on the root.
   *
   * Every rule on the page reads `--bi-*`, so making a page look like THIS
   * brand is one object rather than forty props. See `identityRegister` for why
   * the colours go through the palette builder instead of straight from the
   * primary hex.
   */
  const register = useMemo(() => buildRegister(model, sections), [model, sections]);

  /*
   * The brand's own typefaces, actually loaded.
   *
   * The page sets its headings in them, and the typography section claims the
   * specimens are "the real thing, not a picture of it" — which is only true if
   * something asked for the font. Cached, so calling it on every render of
   * every brand is free.
   */
  useEffect(() => {
    loadBrandFonts(brand);
  }, [brand]);

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
    <IdentityModelContext.Provider value={model}>
      <IdentityRegisterContext.Provider value={register}>
        <div data-identity data-mode={mode} data-branded={register.branded ? '' : undefined} style={register.tokens}>
          <IdentityNav brandName={model.name} sections={sections} actions={actions} />

          <main>
            <IdentityHero model={model} register={register} />
            {/* Not a section: it has no heading, no nav entry and nothing of
                its own — every tile is another section's headline. */}
            <Glance model={model} register={register} />
            {model.introduction.present && <Introduction model={model} />}
            {model.purpose.present && <Purpose model={model} />}
            {model.personality.present && <Personality model={model} />}
            {model.logo.present && <LogoSystem model={model} register={register} />}
            {model.logoUsage.present && <LogoUsage model={model} />}
            {model.colour.present && <Colour model={model} register={register} />}
            {model.typography.present && <Typography model={model} register={register} />}
            {model.voice.present && <Voice model={model} />}
            {model.photography.present && <Photography model={model} />}
            {model.assets.present && <Assets model={model} />}
            {model.social.present && <SocialApplications model={model} register={register} />}
            <Downloads model={model} />
            <Closing model={model} register={register} />
          </main>
        </div>
      </IdentityRegisterContext.Provider>
    </IdentityModelContext.Provider>
  );
}

export default BrandIdentityPage;
