import { ArrowRight } from '@/features/setup/components/SetupIcons';
import { WorkspacePlaceholder } from '@/features/setup/components/WorkspacePlaceholder';

export default function BrandGuidelineTabPage() {
  return (
    <WorkspacePlaceholder
      eyebrow="Guideline"
      title="A living brand book — not a PDF."
      description="Slide-by-slide guidelines that update as your brand evolves. Shareable via public link, exportable when you need a deck."
      actions={
        <button type="button" className="pill-btn pill-btn--primary">
          <span>Coming soon</span>
          <ArrowRight size={14} className="pill-btn-arrow" />
        </button>
      }
    />
  );
}
