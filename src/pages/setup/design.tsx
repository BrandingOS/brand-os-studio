import { ArrowRight } from '@/features/setup/components/SetupIcons';
import { WorkspacePlaceholder } from '@/features/setup/components/WorkspacePlaceholder';

export default function WorkspaceDesignPage() {
  return (
    <WorkspacePlaceholder
      eyebrow="Design"
      title="A canvas that knows your brand."
      description="Start from a blank frame or ask AI for a first draft — the result always stays inside your colors, your type, your voice."
      actions={
        <button type="button" className="pill-btn pill-btn--primary">
          <span>Open canvas</span>
          <ArrowRight size={14} className="pill-btn-arrow" />
        </button>
      }
    />
  );
}
