import { ArrowRight } from '@/features/setup/components/SetupIcons';
import { WorkspacePlaceholder } from '@/features/setup/components/WorkspacePlaceholder';

export default function WorkspaceToolsPage() {
  return (
    <WorkspacePlaceholder
      eyebrow="Tools"
      title="A shelf of small, sharp tools."
      description="Logo variants, contrast checker, color extractor, type pairing, presentation exporter — each tool works alone, or inside your brand."
      actions={
        <button type="button" className="pill-btn pill-btn--ghost">
          <span>Browse tools</span>
          <ArrowRight size={14} className="pill-btn-arrow" />
        </button>
      }
    />
  );
}
