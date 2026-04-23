import { ArrowRight } from '@/features/setup/components/SetupIcons';
import { WorkspacePlaceholder } from '@/features/setup/components/WorkspacePlaceholder';

export default function BrandToolsTabPage() {
  return (
    <WorkspacePlaceholder
      eyebrow="Tools"
      title="Everything your brand needs, in one place."
      description="Asset library, exports, public share links, brand validation, and contrast checks — all brand-scoped, all one click away."
      actions={
        <button type="button" className="pill-btn pill-btn--primary">
          <span>Coming soon</span>
          <ArrowRight size={14} className="pill-btn-arrow" />
        </button>
      }
    />
  );
}
