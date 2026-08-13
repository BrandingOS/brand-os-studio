// Intake types moved to `@/shared/upload/intakeTypes` (spec 002) so they
// survive this folder's retirement. Re-exported here so the legacy flow keeps
// compiling until it is deleted.
export type {
  AssetKind,
  FontSource,
  LogoSlot,
  SocialPlatformId,
  OnboardingAsset,
} from '@/shared/upload/intakeTypes';

export interface AboutSection {
  id: string;
  name: string;
  content: string;
}

export interface DefineAnswers {
  name: string;
  description: string;
  /** Slogan the user typed inline on the review page. Overrides whatever was
   *  parsed out of the description; empty/undefined falls back to the parse. */
  slogan?: string;
}

export interface FeelPalette {
  id: string;
  name: string;
  vibe: string;
  colors: string[];
  locked: boolean;
  isCustom: boolean;
}

export interface StyleCardState {
  id: string;
  locked: boolean;
  fontIdx: number;
}

export type CreateStep = 1 | 2;

export type SetupPanel = 1 | 2;
