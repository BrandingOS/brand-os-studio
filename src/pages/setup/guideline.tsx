import { ArrowRight } from '@/features/setup/components/SetupIcons';
import { WorkspacePlaceholder } from '@/features/setup/components/WorkspacePlaceholder';

export default function WorkspaceGuidelinePage() {
  return (
    <WorkspacePlaceholder
      eyebrow="Guideline"
      title="A living guideline."
      description="Slides, blocks, and examples. Edit once, ship everywhere — and let your team pull exactly what they need."
      actions={
        <button type="button" className="pill-btn pill-btn--ghost">
          <span>Start from template</span>
          <ArrowRight size={14} className="pill-btn-arrow" />
        </button>
      }
    />
  );
}
