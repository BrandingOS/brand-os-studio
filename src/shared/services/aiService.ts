import { toast } from 'sonner';

interface BrandContext {
  name: string;
  tone: string;
  audience: string;
  primaryColor?: string;
  fonts?: {
    primary: string;
    secondary?: string;
  };
}

interface GenerateContentParams {
  tool: string;
  prompt: string;
  brand: BrandContext;
}

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 1024;

function getApiKey(): string | undefined {
  return import.meta.env.VITE_ANTHROPIC_API_KEY;
}

function buildSystemPrompt(tool: string, brand: BrandContext): string {
  const brandInfo = `Brand: "${brand.name}" | Tone: ${brand.tone} | Target Audience: ${brand.audience}`;

  const templates: Record<string, string> = {
    slogan: `You are an expert brand strategist and copywriter. Generate compelling, memorable slogans and taglines.

${brandInfo}

Rules:
- Each slogan should be concise (under 10 words is ideal)
- Reflect the brand's tone and appeal to the target audience
- Be original, avoid cliches
- Return exactly 5 slogans, one per line
- Do NOT number them or add bullet points — just plain text, one per line
- Do NOT include any other commentary or explanation`,

    mission: `You are an expert brand strategist specializing in mission and vision statements.

${brandInfo}

Rules:
- Create clear, inspiring statements that define purpose and direction
- Align with the brand's tone and audience
- Return exactly 3 mission/vision statements, one per line
- Each should be 1-2 sentences
- Do NOT number them or add bullet points — just plain text, one per line
- Do NOT include any other commentary or explanation`,

    voice: `You are a brand voice and tone specialist.

${brandInfo}

Rules:
- Define the brand's personality through communication style
- Include guidance on language, formality, and emotional register
- Return exactly 3 brand voice descriptions, each separated by a blank line
- Each should be 1-2 sentences
- Do NOT number them or add bullet points — just plain text
- Do NOT include any other commentary or explanation`,

    'color-analysis': `You are a color psychology and branding expert.

${brandInfo}
Primary Color: ${brand.primaryColor || 'not specified'}

Rules:
- Analyze the psychological impact and cultural associations of the brand's colors
- Explain how the colors align with the brand's personality and audience
- Return exactly 3 color analysis insights, each separated by a blank line
- Each should be 1-2 sentences
- Do NOT number them or add bullet points — just plain text
- Do NOT include any other commentary or explanation`,

    typography: `You are a typography and design systems expert.

${brandInfo}
Primary Font: ${brand.fonts?.primary || 'not specified'}
Secondary Font: ${brand.fonts?.secondary || 'not specified'}

Rules:
- Suggest font pairings and typographic strategies that match the brand's identity
- Consider readability, personality, and cross-platform compatibility
- Return exactly 3 typography recommendations, each separated by a blank line
- Each should be 1-2 sentences
- Do NOT number them or add bullet points — just plain text
- Do NOT include any other commentary or explanation`,
  };

  return templates[tool] || templates.slogan;
}

function parseResponse(text: string, tool: string): string[] {
  // Split on double newlines first (for voice/color-analysis/typography which use blank line separators)
  // If that doesn't yield enough results, split on single newlines
  const byDoubleNewline = text
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (byDoubleNewline.length >= 3) {
    return byDoubleNewline;
  }

  // Fall back to single newline split (for slogans)
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function callAnthropicAPI(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API_KEY_MISSING');
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Anthropic API error:', response.status, errorBody);
    throw new Error(`API request failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;
  if (!content) {
    throw new Error('Empty response from API');
  }

  return content;
}

function generateMockContent(tool: string, brand: BrandContext): string[] {
  switch (tool) {
    case 'slogan':
      return [
        `${brand.name}: Where Innovation Meets Excellence`,
        `${brand.name} - Crafting Tomorrow's Solutions Today`,
        `Experience the ${brand.name} Difference`,
        `${brand.name}: Redefining Possibilities`,
        `Beyond Expectations, Beyond ${brand.name}`,
      ];
    case 'mission':
      return [
        `To empower businesses and individuals through innovative solutions that drive meaningful change and create lasting value in our communities.`,
        `We exist to transform challenges into opportunities, delivering exceptional experiences that inspire growth and foster connection.`,
        `Our mission is to lead with purpose, creating products and services that enhance lives and build a more sustainable future.`,
      ];
    case 'voice':
      return [
        'Professional yet approachable, confident but not arrogant. We speak with clarity and warmth.',
        'Innovative and forward-thinking, with a human touch. Our voice is inspiring and trustworthy.',
        'Friendly, knowledgeable, and empowering. We communicate with enthusiasm and authenticity.',
      ];
    case 'color-analysis':
      return [
        `${brand.primaryColor || '#000000'} conveys trust and professionalism, perfect for building confidence.`,
        `The color palette creates a sense of innovation and reliability, ideal for modern brands.`,
        `These colors evoke feelings of growth, stability, and forward-thinking leadership.`,
      ];
    case 'typography':
      return [
        `${brand.fonts?.primary || 'Inter'} pairs beautifully with modern serif fonts for elegant contrast.`,
        `Consider pairing with Source Sans Pro for optimal readability and professional appeal.`,
        `This font family works excellently with geometric sans-serifs for a contemporary look.`,
      ];
    default:
      return ['Generated content will appear here'];
  }
}

export function isAIConfigured(): boolean {
  return !!getApiKey();
}

export async function generateContent(
  params: GenerateContentParams
): Promise<{ options: string[]; isAI: boolean }> {
  const { tool, prompt, brand } = params;

  if (!isAIConfigured()) {
    // Fall back to mock generation
    return { options: generateMockContent(tool, brand), isAI: false };
  }

  try {
    const systemPrompt = buildSystemPrompt(tool, brand);
    const responseText = await callAnthropicAPI(systemPrompt, prompt);
    const options = parseResponse(responseText, tool);

    if (options.length === 0) {
      throw new Error('No content could be parsed from the response');
    }

    return { options, isAI: true };
  } catch (error: any) {
    if (error.message === 'API_KEY_MISSING') {
      return { options: generateMockContent(tool, brand), isAI: false };
    }

    console.error('AI generation failed, falling back to mock:', error);
    toast.error('AI generation failed. Showing sample content instead.');
    return { options: generateMockContent(tool, brand), isAI: false };
  }
}

export const aiService = {
  generateContent,
  isAIConfigured,
};

export default aiService;
