/**
 * Onboarding's Build-with-AI helper: the shared handoff menu, holding the
 * brief prompt.
 *
 * The popover itself moved to `@/shared/ai-handoff` when Setup's Brand
 * Strategy section wanted the same interaction with a different prompt. What
 * stays here is the only part that was ever onboarding's — WHICH prompt.
 */
import { AiPromptMenu } from '@/shared/ai-handoff/AiPromptMenu';
import { buildBriefPrompt } from './prompt';

export function BuildWithAI({ brandName }: { brandName: string }) {
  return <AiPromptMenu prompt={() => buildBriefPrompt(brandName)} />;
}
