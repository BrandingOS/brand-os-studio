import { ArrowRight } from '@/features/setup/components/SetupIcons';
import { WorkspacePlaceholder } from '@/features/setup/components/WorkspacePlaceholder';

export default function BrandDesignTabPage() {
  return (
    <WorkspacePlaceholder
      eyebrow="Design"
      title="Your on-brand canvas — always."
      description="Blank canvas, AI-generated designs, and templates for social, print, and screen. Every export lands back in your Brand Kit."
      actions={
        <button type="button" className="pill-btn pill-btn--primary">
          <span>Coming soon</span>
          <ArrowRight size={14} className="pill-btn-arrow" />
        </button>
      }
    />
  );
}
