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

export function buildAIPrompt(brandName: string): string {
  const name = brandName.trim() || '[BRAND_NAME]';
  return `I'm building a brand called ${name}.

I want you to help me fully define and expand this brand from every possible angle.

Here's what I need:

1. Brand Overview
- What could this brand stand for?
- What problem does it solve?
- What makes it different?

2. Target Audience
- Who are the ideal customers?
- What do they care about?
- What are their behaviors and motivations?

3. Brand Personality
- If this brand were a person, how would it act?
- Tone of voice, attitude, energy

4. Brand Values
- What does the brand believe in?
- What principles guide it?

5. Positioning
- Where does it sit in the market? (budget / premium / luxury)
- How should it be perceived?

6. Messaging
- Tagline ideas
- Key messages
- Emotional hooks

7. Visual Direction
- What kind of visual style fits this brand?
- Colors, mood, aesthetic references

8. Competitive Edge
- What would make this brand stand out?

Be creative, strategic, and detailed. Think like a top-tier brand strategist.`;
}
