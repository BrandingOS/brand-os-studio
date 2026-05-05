// Design landing — brand-scoped surface at /b/:slug/design.
//
// Single scroll page composed of three sections:
//   1. Hero — brand-aware title + AI prompt + format chips
//   2. Recent projects — IDesignStorage.listDesigns(brand.id)
//   3. Templates gallery — ITemplatesService, brand-aware open
//
// All affordances eventually land on the unified editor at
// /b/:slug/design/:designId. The hero forwards a typed prompt via
// ?prompt=… so the editor's AI prompt bar pre-fills.

import { WorkspaceShell } from '@/shared/layouts/WorkspaceShell';
import { container as serviceContainer } from '@/core/container/ServiceContainer';
import { SERVICE_KEYS } from '@/core';
import type { IDesignStorage } from '@/core/types/services';
import type { ITemplatesService } from '@/core/services/ITemplatesService';
import type { Brand } from '@/shared/types/brand';
import { DesignHero } from './DesignHero';
import { DesignRecentRow } from './DesignRecentRow';
import { DesignTemplateGallery } from './DesignTemplateGallery';
import './design-alt.css';

interface Props {
  slug: string;
  brand: Brand | undefined;
  isLoading: boolean;
  error: string | undefined;
}

export function DesignCosmosPage({ brand, isLoading, error }: Props) {
  // Defensive service lookup — some test harnesses clear the
  // container without re-registering. Render a graceful state
  // rather than crashing the whole brand page.
  const designStorage = serviceContainer.has(SERVICE_KEYS.DESIGN_STORAGE)
    ? serviceContainer.get<IDesignStorage>(SERVICE_KEYS.DESIGN_STORAGE)
    : null;
  const templates = serviceContainer.has(SERVICE_KEYS.TEMPLATES)
    ? serviceContainer.get<ITemplatesService>(SERVICE_KEYS.TEMPLATES)
    : null;

  if (isLoading && !brand) {
    return (
      <WorkspaceShell>
        <div className="dh-state" role="main">
          <span className="dh-state-eyebrow">Design</span>
          <h1>Loading brand…</h1>
          <p>One moment while we resolve this brand.</p>
        </div>
      </WorkspaceShell>
    );
  }

  if (error || !brand) {
    return (
      <WorkspaceShell>
        <div className="dh-state" role="main">
          <span className="dh-state-eyebrow">Design</span>
          <h1>We couldn't find that brand.</h1>
          <p>{error ?? 'The brand may have been renamed or deleted.'}</p>
        </div>
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell>
      <main className="dh-page" data-design-landing>
        {designStorage ? (
          <DesignHero brand={brand} designStorage={designStorage} />
        ) : (
          <ServiceUnavailableHero brand={brand} />
        )}

        {designStorage ? (
          <DesignRecentRow brand={brand} designStorage={designStorage} />
        ) : null}

        {templates && designStorage ? (
          <DesignTemplateGallery
            brand={brand}
            templates={templates}
            designStorage={designStorage}
          />
        ) : null}
      </main>
    </WorkspaceShell>
  );
}

function ServiceUnavailableHero({ brand }: { brand: Brand }) {
  return (
    <section className="dh-hero">
      <div className="dh-hero-inner">
        <p className="dh-hero-eyebrow">{brand.name} · Design</p>
        <h1 className="dh-hero-title">Design is offline right now</h1>
        <p className="dh-hero-sub">
          Storage isn't configured for this session — refresh the page to retry.
        </p>
      </div>
    </section>
  );
}

export default DesignCosmosPage;
