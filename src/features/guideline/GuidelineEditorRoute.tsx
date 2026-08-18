import { useMemo } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { EditorWorkspace } from '@/shared/editor';
import { useBrandFromSlug } from '@/shared/hooks/useBrandFromSlug';
import { BrandNotFoundPanel } from '@/shared/components/BrandNotFoundPanel';
import {
  DEFAULT_GUIDELINE_TEMPLATE_ID,
  getGuidelineTemplate,
  guidelineEditorKey,
} from './templates/registry';

/**
 * The guideline editor — /b/:slug/guideline/:templateId.
 *
 * Fullscreen and shell-less on purpose: this is a canvas, and the Studio tab
 * bar has no business sitting above one. Same posture as the design editor and
 * the presentation surfaces.
 *
 * It is a THIN host. `EditorWorkspace` (shared/editor, tagged
 * stable/editable-export-v1) already owns the slide navigator, inline editing,
 * the selection inspector, insert, the theme/size/spacing customizer, undo/redo,
 * present mode and PDF/PNG export — all of it real. Rebuilding any of that
 * would have been the wrong move; the previous guideline page's versions of
 * those controls were toasts.
 *
 * Persistence is the editor's own IDB-backed snapshot store, keyed by
 * `editorKey`. That key deliberately matches what the old
 * /b/:slug/brand-guides page used, so edits made before this page existed are
 * still there.
 */
export default function GuidelineEditorRoute() {
  const { slug, templateId } = useParams<{ slug: string; templateId: string }>();
  const navigate = useNavigate();
  const { brand, isLoading } = useBrandFromSlug(slug);

  const template = getGuidelineTemplate(templateId);

  // An unknown template id is a bad link, not an error state — send it to the
  // one we have rather than showing a dead end.
  if (templateId && !template) {
    return <Navigate to={`/b/${slug}/guideline/${DEFAULT_GUIDELINE_TEMPLATE_ID}`} replace />;
  }

  if (!brand) return <BrandNotFoundPanel slug={slug} isLoading={isLoading} />;

  return (
    <GuidelineEditor
      key={`${brand.id}:${template!.id}`}
      brand={brand}
      slug={slug!}
      template={template!}
      onClose={() => navigate(`/b/${slug}/guideline`)}
    />
  );
}

function GuidelineEditor({
  brand,
  template,
  onClose,
}: {
  brand: NonNullable<ReturnType<typeof useBrandFromSlug>['brand']>;
  slug: string;
  template: NonNullable<ReturnType<typeof getGuidelineTemplate>>;
  onClose: () => void;
}) {
  // Rebuilding the deck on every render would discard the editor's in-progress
  // DOM between paints; the brand is the only input that matters.
  const slides = useMemo(() => template.buildSlides(brand), [template, brand]);

  return (
    <EditorWorkspace
      brand={brand}
      slides={slides}
      onClose={onClose}
      editorKey={guidelineEditorKey(template, brand.id)}
      customizerTitle="Guideline"
    />
  );
}
