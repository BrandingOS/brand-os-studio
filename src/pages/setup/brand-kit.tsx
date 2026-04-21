import { ArrowRight } from '@/features/setup/components/SetupIcons';
import { WorkspacePlaceholder } from '@/features/setup/components/WorkspacePlaceholder';

export default function WorkspaceBrandKitPage() {
  return (
    <WorkspacePlaceholder
      eyebrow="Brand Kit"
      title="Every asset, one download."
      description="Logos, palette files, typography, guidelines, and presentation decks — generated from your Setup and ready to share."
      actions={
        <button type="button" className="pill-btn pill-btn--primary">
          <span>Coming soon</span>
          <ArrowRight size={14} className="pill-btn-arrow" />
        </button>
      }
    />
  );
}
