import type { ReactNode, RefObject, MutableRefObject } from 'react';
import { Link } from 'react-router-dom';
import type { DesignSectionKey } from './DesignSidebar';
import {
  ArrowRightIcon,
  BlankCanvasIcon,
  SparkIcon,
  UploadIcon,
  CalendarIcon,
  ClockIcon,
  PresentationIcon,
  InstagramIcon,
  TwitterIcon,
  LinkedInIcon,
  TikTokIcon,
  FacebookIcon,
} from './DesignIcons';

export type DesignBoardRefs = Partial<
  Record<DesignSectionKey, HTMLElement | null>
>;

type Props = {
  slug: string;
  brandName: string;
  sectionRefs: MutableRefObject<DesignBoardRefs> | RefObject<DesignBoardRefs>;
  /** Upload-from-device handler (currently a no-op hook; real wiring lands
   *  when AssetSourcePopover integration is scoped). */
  onUpload?: () => void;
};

/**
 * Right-side board for the Design launchpad.
 *
 * This is a LAUNCHPAD, not a canvas — every affordance links out to an
 * existing fullscreen editor surface (social-media, ai-design, presentations
 * …). Sections follow the SetupBoard `Section` pattern (`.section`,
 * `.section-header`, `.section-body`) so the typography rhythm matches the
 * Setup tab.
 */
export function DesignBoard({ slug, brandName, sectionRefs, onUpload }: Props) {
  const setRef = (key: DesignSectionKey) => (el: HTMLElement | null) => {
    sectionRefs.current[key] = el;
  };

  return (
    <div className="board-wrap">
      <header className="board-head">
        <div className="board-meta">
          <span className="board-live-dot" aria-hidden="true" />
          <span>
            <b>{brandName}</b> · Design
          </span>
        </div>
      </header>

      {/* ─── Start ─── */}
      <LaunchpadSection
        sectionRef={setRef('start')}
        dataKey="start"
        title="Start"
        spec="Create something new"
      >
        <div className="dc-start-grid">
          <Link to={`/editor/design/${slug}`} className="dc-action-card dc-action-card--blank">
            <span className="dc-action-card-glow" aria-hidden />
            <span className="dc-action-card-icon" aria-hidden>
              <BlankCanvasIcon size={22} />
            </span>
            <span className="dc-action-card-body">
              <span className="dc-action-card-title">Blank Canvas</span>
              <span className="dc-action-card-sub">
                Open the editor with your palette pre-loaded.
              </span>
            </span>
            <span className="dc-action-card-cta">
              Open <ArrowRightIcon size={13} />
            </span>
          </Link>

          <Link to={`/b/${slug}/ai-design`} className="dc-action-card dc-action-card--ai">
            <span className="dc-action-card-glow" aria-hidden />
            <span className="dc-action-card-icon" aria-hidden>
              <SparkIcon size={22} />
            </span>
            <span className="dc-action-card-body">
              <span className="dc-action-card-title">AI Design</span>
              <span className="dc-action-card-sub">
                Describe it. Agent generates it on an infinite canvas.
              </span>
            </span>
            <span className="dc-action-card-cta">
              Launch <ArrowRightIcon size={13} />
            </span>
          </Link>

          <button
            type="button"
            onClick={onUpload}
            className="dc-action-card dc-action-card--upload"
          >
            <span className="dc-action-card-glow" aria-hidden />
            <span className="dc-action-card-icon" aria-hidden>
              <UploadIcon size={22} />
            </span>
            <span className="dc-action-card-body">
              <span className="dc-action-card-title">Upload Design</span>
              <span className="dc-action-card-sub">
                Drop a PNG, SVG, or PDF to start from an existing asset.
              </span>
            </span>
            <span className="dc-action-card-cta">
              Upload <ArrowRightIcon size={13} />
            </span>
          </button>
        </div>
      </LaunchpadSection>

      {/* ─── Templates ─── */}
      <LaunchpadSection
        sectionRef={setRef('templates')}
        dataKey="templates"
        title="Templates"
        spec="Bento · Social · Print · Screen · Utility"
        trailing={
          <Link to={`/b/${slug}/templates`} className="dc-section-link">
            Browse all <ArrowRightIcon size={12} />
          </Link>
        }
      >
        <div className="dc-shelf" role="list">
          {MOCK_TEMPLATES.map((tpl) => (
            <Link
              key={tpl.id}
              to={tpl.href(slug)}
              className="dc-template-tile"
              role="listitem"
            >
              <div
                className={`dc-template-thumb ${tpl.thumbClass}`}
                aria-hidden
              >
                <span className="dc-template-thumb-badge">{tpl.category}</span>
              </div>
              <div className="dc-template-meta">
                <span className="dc-template-title">{tpl.title}</span>
                <span className="dc-template-sub">{tpl.sub}</span>
              </div>
            </Link>
          ))}
        </div>
      </LaunchpadSection>

      {/* ─── Recent ─── */}
      <LaunchpadSection
        sectionRef={setRef('recent')}
        dataKey="recent"
        title="Recent Designs"
        spec="Pick up where you left off"
      >
        <div className="dc-empty-state">
          <span className="dc-empty-icon" aria-hidden>
            <ClockIcon size={22} />
          </span>
          <div className="dc-empty-copy">
            <p className="dc-empty-title">No recent designs yet</p>
            <p className="dc-empty-sub">
              Designs you open from this brand will show up here for quick
              access.
            </p>
          </div>
          <Link to={`/b/${slug}/templates`} className="pill-btn pill-btn--ghost">
            <span>Browse templates</span>
            <ArrowRightIcon size={13} className="pill-btn-arrow" />
          </Link>
        </div>
      </LaunchpadSection>

      {/* ─── Content ─── */}
      <LaunchpadSection
        sectionRef={setRef('content')}
        dataKey="content"
        title="Content"
        spec="Plan · Post · Archive"
      >
        <div className="dc-link-row">
          <Link to={`/b/${slug}/content`} className="dc-link-card">
            <span className="dc-link-card-icon" aria-hidden>
              <CalendarIcon size={18} />
            </span>
            <span className="dc-link-card-body">
              <span className="dc-link-card-title">Content Calendar</span>
              <span className="dc-link-card-sub">
                Schedule posts across platforms
              </span>
            </span>
            <ArrowRightIcon size={14} className="dc-link-card-arrow" />
          </Link>
          <Link
            to={`/b/${slug}/content?tab=posts`}
            className="dc-link-card"
          >
            <span className="dc-link-card-icon" aria-hidden>
              <InstagramIcon size={18} />
            </span>
            <span className="dc-link-card-body">
              <span className="dc-link-card-title">Posts</span>
              <span className="dc-link-card-sub">Published + scheduled</span>
            </span>
            <ArrowRightIcon size={14} className="dc-link-card-arrow" />
          </Link>
          <Link
            to={`/b/${slug}/content?tab=drafts`}
            className="dc-link-card"
          >
            <span className="dc-link-card-icon" aria-hidden>
              <ClockIcon size={18} />
            </span>
            <span className="dc-link-card-body">
              <span className="dc-link-card-title">Drafts</span>
              <span className="dc-link-card-sub">Work-in-progress posts</span>
            </span>
            <ArrowRightIcon size={14} className="dc-link-card-arrow" />
          </Link>
        </div>
      </LaunchpadSection>

      {/* ─── Social ─── */}
      <LaunchpadSection
        sectionRef={setRef('social')}
        dataKey="social"
        title="Social"
        spec="Right canvas size, pre-loaded palette"
      >
        <div className="dc-social-grid">
          {SOCIAL_PLATFORMS.map((p) => (
            <Link
              key={p.id}
              to={`/b/${slug}/social-media?platform=${p.id}`}
              className="dc-social-tile"
            >
              <span className={`dc-social-tile-icon dc-social--${p.id}`} aria-hidden>
                <p.icon size={20} />
              </span>
              <span className="dc-social-tile-name">{p.label}</span>
            </Link>
          ))}
        </div>
      </LaunchpadSection>

      {/* ─── Presentations ─── */}
      <LaunchpadSection
        sectionRef={setRef('presentations')}
        dataKey="presentations"
        title="Presentations"
        spec="Branded slide decks"
      >
        <Link to={`/b/${slug}/presentations`} className="dc-feature-card">
          <span className="dc-feature-card-icon" aria-hidden>
            <PresentationIcon size={22} />
          </span>
          <span className="dc-feature-card-body">
            <span className="dc-feature-card-title">Open Presentations</span>
            <span className="dc-feature-card-sub">
              Start a branded deck with your colors, type, and logo baked in.
            </span>
          </span>
          <span className="dc-feature-card-cta">
            Open <ArrowRightIcon size={13} />
          </span>
        </Link>
      </LaunchpadSection>

      {/* ─── AI Design (hero) ─── */}
      <LaunchpadSection
        sectionRef={setRef('ai')}
        dataKey="ai"
        title="AI Design"
        spec="Infinite canvas agent"
      >
        <Link to={`/b/${slug}/ai-design`} className="dc-ai-hero">
          <div className="dc-ai-hero-bg" aria-hidden />
          <div className="dc-ai-hero-content">
            <span className="dc-ai-hero-icon" aria-hidden>
              <SparkIcon size={26} />
            </span>
            <div className="dc-ai-hero-copy">
              <span className="dc-ai-hero-eyebrow">Agentic</span>
              <h3 className="dc-ai-hero-title">
                Describe it. Watch it come together.
              </h3>
              <p className="dc-ai-hero-sub">
                The AI Design agent drafts posters, posts, and layouts on an
                infinite canvas — always on-brand.
              </p>
            </div>
            <span className="dc-ai-hero-cta">
              <span>Launch agent</span>
              <ArrowRightIcon size={14} className="pill-btn-arrow" />
            </span>
          </div>
        </Link>
      </LaunchpadSection>
    </div>
  );
}

/* ─── Section primitive ─── */

function LaunchpadSection({
  dataKey,
  title,
  spec,
  trailing,
  sectionRef,
  children,
}: {
  dataKey: DesignSectionKey;
  title: string;
  spec: string;
  trailing?: ReactNode;
  sectionRef?: (el: HTMLElement | null) => void;
  children: ReactNode;
}) {
  return (
    <section ref={sectionRef} className="section" data-key={dataKey}>
      <div className="section-header">
        <h2>{title}</h2>
        <span className="section-spec">{spec}</span>
        {trailing ? <div className="section-actions">{trailing}</div> : null}
      </div>
      <div className="section-body">{children}</div>
    </section>
  );
}

/* ─── Static mock data ─── */

type TemplateCategory = 'Bento' | 'Social' | 'Print' | 'Screen' | 'Utility';

type MockTemplate = {
  id: string;
  title: string;
  sub: string;
  category: TemplateCategory;
  thumbClass: string;
  /** Best-effort deep link into the workspace templates page so the tile
   *  doesn't dead-end while real template data lands. */
  href: (slug: string) => string;
};

// Deliberately kept as a visual stub — real template data is pulled from the
// workspace `/templates` route and will replace this array once the shelf API
// is wired (tracked in TODO below).
const MOCK_TEMPLATES: MockTemplate[] = [
  {
    id: 'bento-grid',
    title: 'Bento Showcase',
    sub: 'Single-canvas brand overview',
    category: 'Bento',
    thumbClass: 'dc-tpl-thumb--bento',
    href: (slug) => `/b/${slug}/bento`,
  },
  {
    id: 'brand-board',
    title: 'Brand Board',
    sub: 'Editable identity poster',
    category: 'Utility',
    thumbClass: 'dc-tpl-thumb--board',
    href: (slug) => `/b/${slug}/brand-board`,
  },
  {
    id: 'social-square',
    title: 'Social Square',
    sub: '1080 × 1080 post',
    category: 'Social',
    thumbClass: 'dc-tpl-thumb--social-square',
    href: (slug) => `/b/${slug}/social-media?platform=instagram&format=post`,
  },
  {
    id: 'social-story',
    title: 'Social Story',
    sub: '1080 × 1920 vertical',
    category: 'Social',
    thumbClass: 'dc-tpl-thumb--social-story',
    href: (slug) => `/b/${slug}/social-media?platform=instagram&format=story`,
  },
  {
    id: 'print-poster',
    title: 'Print Poster',
    sub: 'A3 vertical',
    category: 'Print',
    thumbClass: 'dc-tpl-thumb--poster',
    href: (slug) => `/b/${slug}/templates?category=print`,
  },
  {
    id: 'screen-hero',
    title: 'Screen Hero',
    sub: 'Website banner',
    category: 'Screen',
    thumbClass: 'dc-tpl-thumb--screen',
    href: (slug) => `/b/${slug}/templates?category=screen`,
  },
  {
    id: 'presentation',
    title: 'Presentation',
    sub: 'Branded slide deck',
    category: 'Screen',
    thumbClass: 'dc-tpl-thumb--presentation',
    href: (slug) => `/b/${slug}/presentations`,
  },
  {
    id: 'guidelines',
    title: 'Guidelines Doc',
    sub: 'Brand manual',
    category: 'Utility',
    thumbClass: 'dc-tpl-thumb--guidelines',
    href: (slug) => `/b/${slug}/guideline`,
  },
];

const SOCIAL_PLATFORMS: Array<{
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}> = [
  { id: 'instagram', label: 'Instagram', icon: InstagramIcon },
  { id: 'twitter', label: 'Twitter', icon: TwitterIcon },
  { id: 'linkedin', label: 'LinkedIn', icon: LinkedInIcon },
  { id: 'tiktok', label: 'TikTok', icon: TikTokIcon },
  { id: 'facebook', label: 'Facebook', icon: FacebookIcon },
];

export default DesignBoard;
