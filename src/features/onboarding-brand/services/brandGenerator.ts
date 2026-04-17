import type { GeneratedBrand } from '../types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 4096;

const SYSTEM_PROMPT = `You are a world-class brand designer. The user will give you a short description of their business. You generate THREE distinct complete brand identity variations.

Return STRICT JSON matching this schema — NO markdown, NO code fences, NO commentary:
{
  "variations": [
    {
      "name": string,
      "tagline": string,
      "description": string,
      "industry": string,
      "audience": {
        "shortDescription": string,
        "ageRange": "18-25" | "26-35" | "36-45" | "46-55" | "55+" | "all-ages",
        "pricePoint": "budget" | "mid-range" | "premium" | "luxury"
      },
      "voice": {
        "traits": [string, string, string],
        "tone": "casual" | "professional" | "friendly" | "authoritative" | "playful"
      },
      "colors": {
        "primary": "#RRGGBB",
        "secondary": "#RRGGBB",
        "accent": "#RRGGBB",
        "neutrals": ["#RRGGBB", "#RRGGBB", "#RRGGBB", "#RRGGBB"],
        "mood": "warm" | "cool" | "neutral" | "vibrant" | "muted" | "pastel" | "dark" | "earthy"
      },
      "fonts": {
        "heading": string,
        "body": string,
        "style": string
      },
      "logoConcept": {
        "style": "wordmark" | "monogram" | "symbol",
        "description": string
      },
      "personality": {
        "values": [string, string, string],
        "visualStyle": "minimalist" | "modern" | "playful" | "elegant" | "bold" | "organic"
      }
    },
    { ... variation 2 ... },
    { ... variation 3 ... }
  ]
}

Allowed Google Fonts (use EXACT name): Inter, Sora, Space Grotesk, DM Sans, Plus Jakarta Sans, Manrope, Figtree, Outfit, Poppins, Montserrat, Raleway, Playfair Display, Fraunces, Lora, Merriweather, Cormorant Garamond, Oswald, Bebas Neue, Work Sans, Nunito, Source Sans Pro, IBM Plex Sans, IBM Plex Serif, DM Serif Display, Archivo.

Brand generation rules:
- The three variations must be genuinely different directions (e.g., one minimalist, one bold, one organic). Not three shades of the same idea.
- Brand name should be memorable and specific — never echo the user's description verbatim.
- Tagline: 3-8 words.
- Description: 1-2 sentences, not marketing fluff.
- Colors follow design theory (complementary, analogous, triadic). Primary must have >= 4.5:1 contrast with either white (#FFFFFF) or a clear dark neutral from the palette.
- Neutrals: 4 values, light to dark (e.g., near-white, light gray, dark gray, near-black).
- Font pairings: heading and body MUST differ in category (e.g., serif heading + sans body, or geometric display + humanist body). Never pick the same font for both.
- Voice traits: 3 distinct adjectives that match the industry (no "playful" for a law firm, no "authoritative" for a toy brand).
- Logo concept description: 1 sentence, concrete and visual (e.g., "Lowercase geometric wordmark with a subtle droplet mark replacing the dot on the i").
- All three variations should feel professionally designed — no generic placeholders.`;

function getApiKey(): string | undefined {
  return (import.meta as { env?: Record<string, string | undefined> }).env
    ?.VITE_ANTHROPIC_API_KEY;
}

export function isAIConfigured(): boolean {
  return !!getApiKey();
}

function extractJSON(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }
  return text.trim();
}

async function callClaude(
  userPrompt: string,
  signal?: AbortSignal,
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('API_KEY_MISSING');

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Business description: "${userPrompt}"\n\nReturn the JSON with 3 distinct brand variations.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Brand generator API error:', response.status, errorBody);
    throw new Error(`API request failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;
  if (!content) throw new Error('Empty response from API');
  return content;
}

function isValidHex(v: unknown): v is string {
  return typeof v === 'string' && /^#[0-9A-Fa-f]{6}$/.test(v);
}

function isGeneratedBrand(v: unknown): v is GeneratedBrand {
  if (!v || typeof v !== 'object') return false;
  const b = v as Record<string, unknown>;
  const colors = b.colors as Record<string, unknown> | undefined;
  const fonts = b.fonts as Record<string, unknown> | undefined;
  return (
    typeof b.name === 'string' &&
    typeof b.tagline === 'string' &&
    !!colors &&
    isValidHex(colors.primary) &&
    isValidHex(colors.secondary) &&
    isValidHex(colors.accent) &&
    Array.isArray(colors.neutrals) &&
    !!fonts &&
    typeof fonts.heading === 'string' &&
    typeof fonts.body === 'string'
  );
}

export async function generateBrandVariations(
  userPrompt: string,
  signal?: AbortSignal,
): Promise<GeneratedBrand[]> {
  if (!isAIConfigured()) {
    return buildFallbackVariations(userPrompt);
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const raw = await callClaude(userPrompt, signal);
      const json = extractJSON(raw);
      const parsed = JSON.parse(json) as { variations?: unknown };
      const list = Array.isArray(parsed.variations) ? parsed.variations : [];
      const valid = list.filter(isGeneratedBrand);
      if (valid.length >= 1) {
        while (valid.length < 3) valid.push(valid[valid.length - 1]);
        return valid.slice(0, 3);
      }
      throw new Error('No valid variations parsed');
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') throw err;
      lastError = err;
    }
  }
  console.error('Brand generation failed after retries:', lastError);
  return buildFallbackVariations(userPrompt);
}

export async function regenerateSingleVariation(
  userPrompt: string,
  signal?: AbortSignal,
): Promise<GeneratedBrand> {
  const all = await generateBrandVariations(userPrompt, signal);
  return all[Math.floor(Math.random() * all.length)];
}

function buildFallbackVariations(userPrompt: string): GeneratedBrand[] {
  const presets: GeneratedBrand[] = [
    {
      name: 'Vitalis',
      tagline: 'Built for how you actually live',
      description: `A thoughtful brand inspired by: ${userPrompt.slice(0, 120)}`,
      industry: 'Lifestyle',
      audience: {
        shortDescription: 'Busy professionals who want quality without complexity',
        ageRange: '26-35',
        pricePoint: 'mid-range',
      },
      voice: {
        traits: ['Motivating', 'Direct', 'Warm'],
        tone: 'friendly',
      },
      colors: {
        primary: '#0F766E',
        secondary: '#1F2937',
        accent: '#F59E0B',
        neutrals: ['#F9FAFB', '#E5E7EB', '#6B7280', '#111827'],
        mood: 'cool',
      },
      fonts: {
        heading: 'Sora',
        body: 'Inter',
        style: 'Modern geometric',
      },
      logoConcept: {
        style: 'wordmark',
        description: 'Clean lowercase wordmark with a subtle weight shift.',
      },
      personality: {
        values: ['Clarity', 'Momentum', 'Care'],
        visualStyle: 'modern',
      },
    },
    {
      name: 'Kindred',
      tagline: 'Small steps, big change',
      description: `A warm, approachable brand built around: ${userPrompt.slice(0, 120)}`,
      industry: 'Wellness',
      audience: {
        shortDescription: 'People looking for gentle, sustainable habits',
        ageRange: 'all-ages',
        pricePoint: 'mid-range',
      },
      voice: {
        traits: ['Gentle', 'Honest', 'Grounded'],
        tone: 'casual',
      },
      colors: {
        primary: '#B45309',
        secondary: '#78350F',
        accent: '#FBBF24',
        neutrals: ['#FFFBEB', '#FEF3C7', '#78716C', '#1C1917'],
        mood: 'earthy',
      },
      fonts: {
        heading: 'Fraunces',
        body: 'Inter',
        style: 'Warm serif',
      },
      logoConcept: {
        style: 'symbol',
        description: 'Leaf-and-word lockup with a soft organic curve.',
      },
      personality: {
        values: ['Warmth', 'Trust', 'Patience'],
        visualStyle: 'organic',
      },
    },
    {
      name: 'Axiom',
      tagline: 'The standard, redefined',
      description: `A premium, confident brand reflecting: ${userPrompt.slice(0, 120)}`,
      industry: 'Technology',
      audience: {
        shortDescription: 'Decision-makers who expect quality and precision',
        ageRange: '36-45',
        pricePoint: 'premium',
      },
      voice: {
        traits: ['Precise', 'Confident', 'Refined'],
        tone: 'professional',
      },
      colors: {
        primary: '#111827',
        secondary: '#4F46E5',
        accent: '#F59E0B',
        neutrals: ['#FFFFFF', '#E5E7EB', '#6B7280', '#030712'],
        mood: 'dark',
      },
      fonts: {
        heading: 'Playfair Display',
        body: 'Inter',
        style: 'Classic editorial',
      },
      logoConcept: {
        style: 'monogram',
        description: 'Tight monogram lockup with crisp spacing and a high-contrast serif.',
      },
      personality: {
        values: ['Excellence', 'Precision', 'Trust'],
        visualStyle: 'elegant',
      },
    },
  ];
  return presets;
}
