import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CosmosWorkspaceShell } from '@/shared/layouts/CosmosWorkspaceShell';
import type { Brand } from '@/shared/types/brand';
import { ArrowRightIcon } from './DesignIcons';
import { DesignSidebar, type DesignSectionKey } from './DesignSidebar';
import { DesignBoard, type DesignBoardRefs } from './DesignBoard';
import './design-cosmos.css';

type Props = {
  slug: string;
  brand: Brand | undefined;
  isLoading: boolean;
  error: string | undefined;
};

/**
 * Design — v2 launchpad surface.
 *
 * This is the brand-scoped "start something new" page. It is NOT a canvas —
 * all fullscreen editor surfaces (AI Design, Design-with-AI, Presentations,
 * Social Media, the core Fabric editor) keep their own routes. This page
 * links into each of them from a single composed shell that matches the
 * Setup tab's rhythm.
 *
 * Layout follows the shared `.shell` + `.panel` + `.board-wrap` primitives
 * documented in src/shared/styles/cosmos-workspace.css. Section-local
 * styling lives in ./design-cosmos.css.
 */
export function DesignCosmosPage({ slug, brand, isLoading, error }: Props) {
  const [activeKey, setActiveKey] = useState<DesignSectionKey | null>('start');
  const sectionRefs = useRef<DesignBoardRefs>({
    start: null,
    templates: null,
    recent: null,
    content: null,
    social: null,
    presentations: null,
    ai: null,
  });

  const handleJump = useCallback((key: DesignSectionKey) => {
    setActiveKey(key);
    const el = sectionRefs.current[key];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleUpload = useCallback(() => {
    // Upload-from-device is currently a placeholder — the real hook-up goes
    // through AssetSourcePopover in the canonical picker pattern (see CLAUDE.md).
    // Keeping this as a toast so the affordance isn't dead, but the dialog
    // integration is a follow-up tracked inline.
    toast('Upload Design', {
      description:
        'File upload wiring lands when the shared AssetSourcePopover is pulled into the v2 shell.',
    });
  }, []);

  if (isLoading && !brand) {
    return (
      <CosmosWorkspaceShell>
        <div className="workspace-empty" role="main">
          <span className="workspace-empty-eyebrow">Design</span>
          <h1>Loading brand…</h1>
          <p>One moment while we resolve this brand.</p>
        </div>
      </CosmosWorkspaceShell>
    );
  }

  if (error || !brand) {
    return (
      <CosmosWorkspaceShell>
        <div className="workspace-empty" role="main">
          <span className="workspace-empty-eyebrow">Design</span>
          <h1>We couldn't find that brand.</h1>
          <p>{error ?? 'The brand may have been renamed or deleted.'}</p>
        </div>
      </CosmosWorkspaceShell>
    );
  }

  return (
    <CosmosWorkspaceShell
      rightActions={
        <a
          href={`/b/${slug}/ai-design`}
          className="pill-btn pill-btn--primary"
        >
          <span>New with AI</span>
          <ArrowRightIcon size={14} className="pill-btn-arrow" />
        </a>
      }
    >
      <div className="shell">
        <DesignSidebar
          brandName={brand.name}
          activeKey={activeKey}
          onJump={handleJump}
        />
        <DesignBoard
          slug={slug}
          brandName={brand.name}
          sectionRefs={sectionRefs}
          onUpload={handleUpload}
        />
      </div>
    </CosmosWorkspaceShell>
  );
}

export default DesignCosmosPage;
