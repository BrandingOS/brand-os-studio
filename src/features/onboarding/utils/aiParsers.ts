import type { ParsedField } from '../components/AIAssistBox';

// ---------------------------------------------------------------------------
// AI-powered parsers with regex fallback
//
// When VITE_ANTHROPIC_API_KEY is set, parsers use Claude to intelligently
// extract structured data from free text. Otherwise, they fall back to the
// original keyword-based regex matching.
// ---------------------------------------------------------------------------

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

function getApiKey(): string | undefined {
  return (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_ANTHROPIC_API_KEY;
}

async function callClaude(systemPrompt: string, userText: string): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
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
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: 'user', content: userText }],
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.content?.[0]?.text || null;
  } catch {
    return null;
  }
}

function safeParseJSON(text: string): Record<string, any> | null {
  try {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    }
    return null;
  } catch {
    return null;
  }
}

function fieldsFromObject(obj: Record<string, any>, labelMap: Record<string, string>): ParsedField[] {
  const fields: ParsedField[] = [];
  for (const [key, label] of Object.entries(labelMap)) {
    const value = obj[key];
    if (value !== undefined && value !== null && value !== '') {
      fields.push({ key, label, value });
    }
  }
  return fields;
}

// ---------------------------------------------------------------------------
// Keyword-based fallback helpers
// ---------------------------------------------------------------------------

const INDUSTRIES: Record<string, string> = {
  tech: 'technology', technology: 'technology', software: 'technology', saas: 'technology', ai: 'technology',
  health: 'healthcare', healthcare: 'healthcare', medical: 'healthcare',
  finance: 'finance', fintech: 'finance', banking: 'finance',
  education: 'education', edtech: 'education',
  retail: 'retail', ecommerce: 'retail', 'e-commerce': 'retail',
  food: 'food-beverage', beverage: 'food-beverage', restaurant: 'food-beverage',
  'real estate': 'real-estate', property: 'real-estate',
  consulting: 'consulting', agency: 'consulting',
  marketing: 'marketing', manufacturing: 'manufacturing',
  entertainment: 'entertainment', media: 'entertainment',
  nonprofit: 'non-profit', 'non-profit': 'non-profit', charity: 'non-profit',
};

const PERSONALITY_TRAITS = [
  'innovative', 'trustworthy', 'playful', 'professional', 'bold', 'elegant',
  'friendly', 'authoritative', 'modern', 'minimal', 'luxury', 'fun',
  'serious', 'warm', 'sophisticated',
];

const TONES = ['casual', 'professional', 'friendly', 'authoritative', 'playful'];

const VALUES = [
  'quality', 'innovation', 'sustainability', 'integrity', 'creativity',
  'transparency', 'reliability', 'excellence', 'community', 'trust',
  'passion', 'simplicity', 'empowerment', 'diversity', 'collaboration',
];

const VISUAL_STYLES = ['minimalist', 'modern', 'playful', 'elegant', 'bold', 'organic'];

const COLOR_MOODS: Record<string, string> = {
  blue: 'calm, professional, trustworthy', red: 'energetic, passionate, bold',
  green: 'natural, growth, fresh', purple: 'creative, luxury, mysterious',
  orange: 'friendly, energetic, warm', yellow: 'optimistic, warm, cheerful',
  pink: 'playful, feminine, modern', black: 'sophisticated, luxury, powerful',
  white: 'clean, minimal, pure', warm: 'warm, inviting tones',
  cool: 'cool, calm tones', neutral: 'balanced, understated',
  vibrant: 'energetic, eye-catching', muted: 'soft, subtle, refined',
  pastel: 'gentle, soft, approachable', dark: 'dramatic, powerful, modern',
  earthy: 'natural, grounded, organic',
};

function findMatches(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw.toLowerCase()));
}

function extractQuoted(text: string): string[] {
  const matches = text.match(/["']([^"']+)["']/g);
  return matches ? matches.map((m) => m.replace(/["']/g, '').trim()) : [];
}

function extractBrandName(text: string): string | null {
  const calledMatch = text.match(/(?:called|named)\s+["']?([A-Z][A-Za-z0-9 ]+)/);
  if (calledMatch) return calledMatch[1].trim();
  const quoted = extractQuoted(text);
  if (quoted.length > 0) return quoted[0];
  return null;
}

function extractURL(text: string): string | null {
  const urlMatch = text.match(
    /https?:\/\/[^\s,]+|www\.[^\s,]+|\b[a-z0-9-]+\.(com|io|co|org|net|app)\b/i,
  );
  return urlMatch ? urlMatch[0] : null;
}

// ---------------------------------------------------------------------------
// Step-specific parsers (Claude-powered with regex fallback)
// ---------------------------------------------------------------------------

/** Step 1a / 1b: Brand Basics / Brand Info */
export async function parseBrandBasics(text: string): Promise<ParsedField[]> {
  // Try Claude first
  const aiResult = await callClaude(
    `You extract structured brand information from free text. Return ONLY a JSON object with these optional keys: brandName (string), industry (string), tagline (string), website (string), description (string). Only include keys you can confidently extract. Return valid JSON, nothing else.`,
    text,
  );

  if (aiResult) {
    const parsed = safeParseJSON(aiResult);
    if (parsed) {
      const fields = fieldsFromObject(parsed, {
        brandName: 'Brand Name', industry: 'Industry', tagline: 'Tagline',
        website: 'Website', description: 'Description',
      });
      if (fields.length > 0) return fields;
    }
  }

  // Regex fallback
  const fields: ParsedField[] = [];
  const name = extractBrandName(text);
  if (name) fields.push({ key: 'brandName', label: 'Brand Name', value: name });

  const lower = text.toLowerCase();
  for (const [keyword, industry] of Object.entries(INDUSTRIES)) {
    if (lower.includes(keyword)) {
      fields.push({ key: 'industry', label: 'Industry', value: industry });
      break;
    }
  }

  const taglineMatch = text.match(/tagline[:\s]+["']?([^."'\n]+)/i);
  if (taglineMatch) fields.push({ key: 'tagline', label: 'Tagline', value: taglineMatch[1].trim() });

  const url = extractURL(text);
  if (url) fields.push({ key: 'website', label: 'Website', value: url });

  if (text.trim().length > 30) {
    fields.push({ key: 'description', label: 'Description', value: text.trim() });
  }

  return fields;
}

/** Step 2a: Audience & Market */
export async function parseAudienceMarket(text: string): Promise<ParsedField[]> {
  const aiResult = await callClaude(
    `You extract audience and market data from free text. Return ONLY a JSON object with these optional keys: ageRange (string like "25-35" or "all-ages"), gender (string: "male"|"female"|"all"), competitors (string), pricePoint (string: "budget"|"mid-range"|"premium"|"luxury"), description (string). Only include keys you can confidently extract. Return valid JSON, nothing else.`,
    text,
  );

  if (aiResult) {
    const parsed = safeParseJSON(aiResult);
    if (parsed) {
      const fields = fieldsFromObject(parsed, {
        ageRange: 'Age Range', gender: 'Gender', competitors: 'Competitors',
        pricePoint: 'Market Position', description: 'Audience Notes',
      });
      if (fields.length > 0) return fields;
    }
  }

  // Regex fallback
  const fields: ParsedField[] = [];
  const lower = text.toLowerCase();

  const ageMatch = lower.match(/(\d{2})\s*[-–to]+\s*(\d{2})/);
  if (ageMatch) {
    fields.push({ key: 'ageRange', label: 'Age Range', value: `${ageMatch[1]}-${ageMatch[2]}` });
  } else if (lower.includes('young') || lower.includes('gen z') || lower.includes('teen')) {
    fields.push({ key: 'ageRange', label: 'Age Range', value: '18-25' });
  } else if (lower.includes('millennial')) {
    fields.push({ key: 'ageRange', label: 'Age Range', value: '26-35' });
  } else if (lower.includes('all ages') || lower.includes('everyone')) {
    fields.push({ key: 'ageRange', label: 'Age Range', value: 'all-ages' });
  }

  if (lower.includes('women') || lower.includes('female')) {
    fields.push({ key: 'gender', label: 'Gender', value: 'female' });
  } else if (lower.includes('men') && !lower.includes('women')) {
    fields.push({ key: 'gender', label: 'Gender', value: 'male' });
  } else if (lower.includes('everyone') || lower.includes('all genders')) {
    fields.push({ key: 'gender', label: 'Gender', value: 'all' });
  }

  const compMatch = text.match(/compet(?:itors?|e\s+with)[:\s]+([^\n.]+)/i);
  if (compMatch) fields.push({ key: 'competitors', label: 'Competitors', value: compMatch[1].trim() });

  const positionKeywords = ['premium', 'luxury', 'budget', 'mid-range', 'affordable', 'high-end'];
  const posMatch = positionKeywords.find((k) => lower.includes(k));
  if (posMatch) {
    const mapped = posMatch === 'affordable' ? 'budget' : posMatch === 'high-end' ? 'premium' : posMatch;
    fields.push({ key: 'pricePoint', label: 'Market Position', value: mapped });
  }

  if (text.trim().length > 20) {
    fields.push({ key: 'description', label: 'Audience Notes', value: text.trim() });
  }

  return fields;
}

/** Step 3a / 3b: Brand Personality */
export async function parseBrandPersonality(text: string): Promise<ParsedField[]> {
  const aiResult = await callClaude(
    `You extract brand personality data from free text. Return ONLY a JSON object with these optional keys: traits (array of strings like ["Innovative", "Bold"]), tone (string: "casual"|"professional"|"friendly"|"authoritative"|"playful"), values (array of strings like ["Quality", "Innovation"]), voice (string description). Only include keys you can confidently extract. Return valid JSON, nothing else.`,
    text,
  );

  if (aiResult) {
    const parsed = safeParseJSON(aiResult);
    if (parsed) {
      const fields = fieldsFromObject(parsed, {
        traits: 'Personality Traits', tone: 'Brand Tone',
        values: 'Brand Values', voice: 'Brand Voice',
      });
      if (fields.length > 0) return fields;
    }
  }

  // Regex fallback
  const fields: ParsedField[] = [];

  const traits = findMatches(text, PERSONALITY_TRAITS);
  if (traits.length > 0) {
    const capitalised = traits.map((t) => t.charAt(0).toUpperCase() + t.slice(1));
    fields.push({ key: 'traits', label: 'Personality Traits', value: capitalised });
  }

  const toneMatch = TONES.find((t) => text.toLowerCase().includes(t));
  if (toneMatch) fields.push({ key: 'tone', label: 'Brand Tone', value: toneMatch });

  const valuesFound = findMatches(text, VALUES);
  if (valuesFound.length > 0) {
    const capitalised = valuesFound.map((v) => v.charAt(0).toUpperCase() + v.slice(1));
    fields.push({ key: 'values', label: 'Brand Values', value: capitalised });
  }

  const voiceMatch = text.match(/voice[:\s]+["']?([^."'\n]+)/i);
  if (voiceMatch) fields.push({ key: 'voice', label: 'Brand Voice', value: voiceMatch[1].trim() });

  return fields;
}

/** Step 4a: Visual Preferences */
export async function parseVisualPreferences(text: string): Promise<ParsedField[]> {
  const aiResult = await callClaude(
    `You extract visual/design preferences from free text. Return ONLY a JSON object with these optional keys: colorMood (string like "warm" or "cool" or "vibrant"), customColors (array of hex color strings like ["#FF5733"]), visualStyle (string: "minimalist"|"modern"|"playful"|"elegant"|"bold"|"organic"), styleNotes (string). Only include keys you can confidently extract. Return valid JSON, nothing else.`,
    text,
  );

  if (aiResult) {
    const parsed = safeParseJSON(aiResult);
    if (parsed) {
      const fields = fieldsFromObject(parsed, {
        colorMood: 'Color Mood', customColors: 'Colors',
        visualStyle: 'Visual Style', styleNotes: 'Style Notes',
      });
      if (fields.length > 0) return fields;
    }
  }

  // Regex fallback
  const fields: ParsedField[] = [];
  const lower = text.toLowerCase();

  for (const [keyword, mood] of Object.entries(COLOR_MOODS)) {
    if (lower.includes(keyword)) {
      fields.push({ key: 'colorMood', label: 'Color Mood', value: `${keyword} — ${mood}` });
      break;
    }
  }

  const styleMatch = VISUAL_STYLES.find((s) => lower.includes(s));
  if (styleMatch) fields.push({ key: 'visualStyle', label: 'Visual Style', value: styleMatch });

  const hexMatches = text.match(/#[0-9a-fA-F]{3,8}/g);
  if (hexMatches && hexMatches.length > 0) {
    fields.push({ key: 'customColors', label: 'Colors', value: hexMatches });
  }

  if (text.trim().length > 15) {
    fields.push({ key: 'styleNotes', label: 'Style Notes', value: text.trim() });
  }

  return fields;
}
