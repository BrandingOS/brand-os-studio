export const TYPED_PROMPTS = [
  "Tell me everything — what you do, who it's for, and why it matters…",
  "Describe your idea in your own words. I'll structure the rest.",
  'Walk me through your brand: the story, the feeling, the audience…',
  'What are you building, and what makes it different? Take your time.',
  'Share your vision. The more context you give, the better I understand.',
  "What's the soul of your brand? Voice, values, vibe — anything helps.",
  "Explain it like you're telling a friend over coffee. I'll catch every detail.",
];

export const AI_TOOL_NAMES = ['ChatGPT', 'Claude', 'Gemini', 'Perplexity', 'Copilot', 'any AI tool'];

/**
 * The prompt the Copy/ChatGPT/Claude helper hands over.
 *
 * Delegates to the canonical builder so the prompt and the parser that reads
 * its answer can never disagree — the labels emitted here ARE the labels
 * `parseBrief` looks for, which is what lets a pasted response be parsed with
 * no further AI call.
 */
export { buildBriefPrompt as buildAIPrompt } from '@/features/onboarding/brief/prompt';
