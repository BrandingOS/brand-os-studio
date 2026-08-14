/**
 * Screen 3 — the review.
 *
 * The retired "Review your uploads" page: full width, a stack of cards, the
 * brand bar on top, and the same section order it always had —
 * Logos · Colors · Fonts · Links · About · Brand assets.
 *
 * Two things are never said on this screen, and both are deliberate:
 *
 *  - **No model vocabulary.** "Suggested", "confirmed", "provenance",
 *    "authority", "proposal" appear nowhere. The model is underneath; what the
 *    user sees is their brand.
 *  - **No completion pressure.** A section says "2 of 9 decided" because that
 *    helps someone see where they are inside it. There is no global counter, no
 *    bar and no percentage, and "Open my brand" is enabled from the first
 *    moment — finishing with nothing confirmed is a legitimate outcome.
 */
import { DsBanner, DsButton } from '@/shared/ds';
import type { CoreFieldPath } from '@/domain/brand/coreFieldPaths';
import type { LogoSlot, OnboardingAsset } from '@/shared/upload/intakeTypes';
import type { LogoGroup } from '../understanding/logoClassify';
import type { OpenQuestion } from '../understanding/questions';
import type { VocabularyMember } from '../vocabulary/vocabularies';
import { BrandBar } from '../review/BrandBar';
import { LogosSection } from '../review/LogosSection';
import { ColorsSection, type Swatch } from '../review/ColorsSection';
import { FontsSection, type FontRole } from '../review/FontsSection';
import { LinksSection, type BrandLink } from '../review/LinksSection';
import { AboutSection, type AboutValue, type FreeSection } from '../review/AboutSection';
import { AssetsSection } from '../review/AssetsSection';

export interface ReviewStepProps {
  brandName: string;
  slogan: string;
  industryLabel?: string;
  styleLabels: string[];

  logos: { groups: LogoGroup[]; duplicatesIgnored: number };
  swatches: Swatch[];
  colorsDecided: boolean;
  paletteSuggestions: Array<{ name: string; hexes: string[] }>;
  canExtract: boolean;
  fontRoles: FontRole[];
  fontsDecided: boolean;
  pairings: Array<{ heading: string; body: string }>;
  links: BrandLink[];
  about: {
    industry?: { value?: string; vocabulary: VocabularyMember[] };
    products?: string;
    values: AboutValue[];
    freeSections: FreeSection[];
    questions: OpenQuestion[];
  };
  libraryItems: OnboardingAsset[];

  busy: boolean;
  problem: string | null;

  onSlogan(next: string): void;
  onPlaceLogo(assetId: string, slot: LogoSlot): void;
  onRemoveLogo(assetId: string): void;
  onUploadMore(): void;
  onColorsLooksRight(): void;
  onAddColor(): void;
  onExtractFromLogo(): void;
  onExtractFromImage(): void;
  onSuggestPalettes(): void;
  onApplyPalette(hexes: string[]): void;
  onRemoveColor(id: string): void;
  onFontsLooksRight(): void;
  onApplyPairing(p: { heading: string; body: string }): void;
  onRenameFont(role: 'Heading' | 'Body', next: string): void;
  onAddLink(raw: string): void;
  onRemoveLink(id: string): void;
  onToggleChip(path: CoreFieldPath, memberId: string): void;
  onEditText(path: CoreFieldPath, next: string): void;
  onIndustry(memberId: string): void;
  onProducts(next: string): void;
  onAboutLooksRight(): void;
  onAnswer(q: OpenQuestion, answer: string): void;
  onAddSection(): void;
  onEditSection(s: FreeSection): void;
  onRenameAsset(id: string, next: string): void;
  onRemoveAsset(id: string): void;
  onDismissProblem(): void;
  onFinish(): void;
  onBack(): void;
}

export function ReviewStep(p: ReviewStepProps) {
  return (
    <div className="onb-review">
      <header className="onb-review-h">
        <h1 className="onb-review-t">Here&rsquo;s what we found</h1>
        <p className="onb-review-s">Change anything that isn&rsquo;t right. Nothing is locked in.</p>
      </header>

      {p.problem && (
        <DsBanner tone="warning" actionLabel="Dismiss" onAction={p.onDismissProblem}>
          {p.problem}
        </DsBanner>
      )}

      <BrandBar
        name={p.brandName}
        slogan={p.slogan}
        industry={p.industryLabel}
        style={p.styleLabels}
        onSlogan={p.onSlogan}
      />

      <LogosSection
        groups={p.logos.groups}
        duplicatesIgnored={p.logos.duplicatesIgnored}
        onPlace={p.onPlaceLogo}
        onRemove={p.onRemoveLogo}
        onUpload={p.onUploadMore}
      />

      <ColorsSection
        swatches={p.swatches}
        decided={p.colorsDecided}
        suggestions={p.paletteSuggestions}
        canExtract={p.canExtract}
        busy={p.busy}
        onLooksRight={p.onColorsLooksRight}
        onAdd={p.onAddColor}
        onExtractFromLogo={p.onExtractFromLogo}
        onExtractFromImage={p.onExtractFromImage}
        onSuggest={p.onSuggestPalettes}
        onApplyPalette={p.onApplyPalette}
        onRemove={p.onRemoveColor}
      />

      <FontsSection
        roles={p.fontRoles}
        decided={p.fontsDecided}
        pairings={p.pairings}
        busy={p.busy}
        onLooksRight={p.onFontsLooksRight}
        onApplyPairing={p.onApplyPairing}
        onUpload={p.onUploadMore}
        onRename={p.onRenameFont}
      />

      <LinksSection links={p.links} onAdd={p.onAddLink} onRemove={p.onRemoveLink} />

      <AboutSection
        industry={p.about.industry}
        products={p.about.products}
        values={p.about.values}
        freeSections={p.about.freeSections}
        questions={p.about.questions}
        busy={p.busy}
        onToggleChip={p.onToggleChip}
        onEditText={p.onEditText}
        onIndustry={p.onIndustry}
        onProducts={p.onProducts}
        onLooksRight={p.onAboutLooksRight}
        onAnswer={p.onAnswer}
        onAddSection={p.onAddSection}
        onEditSection={p.onEditSection}
      />

      <AssetsSection items={p.libraryItems} onRename={p.onRenameAsset} onRemove={p.onRemoveAsset} />

      <div className="onb-review-f">
        <DsButton tone="tertiary" onClick={p.onBack}>
          Back
        </DsButton>
        {/* Always enabled. Confirming is a choice, not a toll. */}
        <DsButton onClick={p.onFinish} disabled={p.busy}>
          {p.busy ? 'Opening…' : 'Open my brand'}
        </DsButton>
      </div>
    </div>
  );
}
