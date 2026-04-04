import type { ParsedField } from '../components/AIAssistBox';

// ---------------------------------------------------------------------------
// Keyword-based mock AI parsers
//
// Each parser scans the user's free-text for recognisable keywords / patterns
// and returns structured ParsedField[] that the AIAssistBox can display and
// the step component can merge into the onboarding store.
// ---------------------------------------------------------------------------

const INDUSTRIES: Record<string, string> = {
  tech: 'technology',
  technology: 'technology',
  software: 'technology',
  saas: 'technology',
  ai: 'technology',
  health: 'healthcare',
  healthcare: 'healthcare',
  medical: 'healthcare',
  finance: 'finance',
  fintech: 'finance',
  banking: 'finance',
  education: 'education',
  edtech: 'education',
  retail: 'retail',
  ecommerce: 'retail',
  'e-commerce': 'retail',
  food: 'food-beverage',
  beverage: 'food-beverage',
  restaurant: 'food-beverage',
  'real estate': 'real-estate',
  property: 'real-estate',
  consulting: 'consulting',
  agency: 'consulting',
  marketing: 'marketing',
  manufacturing: 'manufacturing',
  entertainment: 'entertainment',
  media: 'entertainment',
  nonprofit: 'non-profit',
  'non-profit': 'non-profit',
  charity: 'non-profit',
};

const PERSONALITY_TRAITS = [
  'innovative',
  'trustworthy',
  'playful',
  'professional',
  'bold',
  'elegant',
  'friendly',
  'authoritative',
  'modern',
  'minimal',
  'luxury',
  'fun',
  'serious',
  'warm',
  'sophisticated',
];

const TONES = [
  'casual',
  'professional',
  'friendly',
  'authoritative',
  'playful',
];

const VALUES = [
  'quality',
  'innovation',
  'sustainability',
  'integrity',
  'creativity',
  'transparency',
  'reliability',
  'excellence',
  'community',
  'trust',
  'passion',
  'simplicity',
  'empowerment',
  'diversity',
  'collaboration',
];

const VISUAL_STYLES = [
  'minimalist',
  'modern',
  'playful',
  'elegant',
  'bold',
  'organic',
];

const COLOR_MOODS: Record<string, string> = {
  blue: 'calm, professional, trustworthy',
  red: 'energetic, passionate, bold',
  green: 'natural, growth, fresh',
  purple: 'creative, luxury, mysterious',
  orange: 'friendly, energetic, warm',
  yellow: 'optimistic, warm, cheerful',
  pink: 'playful, feminine, modern',
  black: 'sophisticated, luxury, powerful',
  white: 'clean, minimal, pure',
  warm: 'warm, inviting tones',
  cool: 'cool, calm tones',
  neutral: 'balanced, understated',
  vibrant: 'energetic, eye-catching',
  muted: 'soft, subtle, refined',
  pastel: 'gentle, soft, approachable',
  dark: 'dramatic, powerful, modern',
  earthy: 'natural, grounded, organic',
};

// ---------------------------------------------------------------------------
// Helper: find matching keywords in text
// ---------------------------------------------------------------------------

function findMatches(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw.toLowerCase()));
}

function extractQuoted(text: string): string[] {
  const matches = text.match(/["']([^"']+)["']/g);
  return matches ? matches.map((m) => m.replace(/["']/g, '').trim()) : [];
}

/** Try to extract a brand-name-like phrase. Heuristic: quoted text or "called X" / "named X" */
function extractBrandName(text: string): string | null {
  // "called Acme" or "named Acme"
  const calledMatch = text.match(/(?:called|named)\s+["']?([A-Z][A-Za-z0-9 ]+)/);
  if (calledMatch) return calledMatch[1].trim();
  // first quoted string
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
// Step-specific parsers
// ---------------------------------------------------------------------------

/** Step 1a / 1b: Brand Basics / Brand Info */
export function parseBrandBasics(text: string): ParsedField[] {
  const fields: ParsedField[] = [];

  const name = extractBrandName(text);
  if (name) fields.push({ key: 'brandName', label: 'Brand Name', value: name });

  // Industry
  const lower = text.toLowerCase();
  for (const [keyword, industry] of Object.entries(INDUSTRIES)) {
    if (lower.includes(keyword)) {
      fields.push({ key: 'industry', label: 'Industry', value: industry });
      break;
    }
  }

  // Tagline — "tagline is ..." or after "tagline:"
  const taglineMatch = text.match(/tagline[:\s]+["']?([^."'\n]+)/i);
  if (taglineMatch) {
    fields.push({ key: 'tagline', label: 'Tagline', value: taglineMatch[1].trim() });
  }

  // Website URL
  const url = extractURL(text);
  if (url) fields.push({ key: 'website', label: 'Website', value: url });

  // Description — use the full text as fallback description if nothing else parsed
  if (text.trim().length > 30) {
    fields.push({ key: 'description', label: 'Description', value: text.trim() });
  }

  return fields;
}

/** Step 2a: Audience & Market */
export function parseAudienceMarket(text: string): ParsedField[] {
  const fields: ParsedField[] = [];
  const lower = text.toLowerCase();

  // Age range detection
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

  // Gender
  if (lower.includes('women') || lower.includes('female')) {
    fields.push({ key: 'gender', label: 'Gender', value: 'female' });
  } else if (lower.includes('men') && !lower.includes('women')) {
    fields.push({ key: 'gender', label: 'Gender', value: 'male' });
  } else if (lower.includes('everyone') || lower.includes('all genders')) {
    fields.push({ key: 'gender', label: 'Gender', value: 'all' });
  }

  // Competitors — "compete with X, Y" or "competitors: X, Y"
  const compMatch = text.match(/compet(?:itors?|e\s+with)[:\s]+([^\n.]+)/i);
  if (compMatch) {
    fields.push({ key: 'competitors', label: 'Competitors', value: compMatch[1].trim() });
  }

  // Market position keywords
  const positionKeywords = ['premium', 'luxury', 'budget', 'mid-range', 'affordable', 'high-end'];
  const posMatch = positionKeywords.find((k) => lower.includes(k));
  if (posMatch) {
    const mapped =
      posMatch === 'affordable' ? 'budget' : posMatch === 'high-end' ? 'premium' : posMatch;
    fields.push({ key: 'pricePoint', label: 'Market Position', value: mapped });
  }

  // Audience description fallback
  if (text.trim().length > 20) {
    fields.push({ key: 'description', label: 'Audience Notes', value: text.trim() });
  }

  return fields;
}

/** Step 3a / 3b: Brand Personality */
export function parseBrandPersonality(text: string): ParsedField[] {
  const fields: ParsedField[] = [];

  // Personality traits
  const traits = findMatches(text, PERSONALITY_TRAITS);
  if (traits.length > 0) {
    // Capitalise first letter
    const capitalised = traits.map((t) => t.charAt(0).toUpperCase() + t.slice(1));
    fields.push({ key: 'traits', label: 'Personality Traits', value: capitalised });
  }

  // Tone
  const toneMatch = TONES.find((t) => text.toLowerCase().includes(t));
  if (toneMatch) {
    fields.push({ key: 'tone', label: 'Brand Tone', value: toneMatch });
  }

  // Values
  const valuesFound = findMatches(text, VALUES);
  if (valuesFound.length > 0) {
    const capitalised = valuesFound.map((v) => v.charAt(0).toUpperCase() + v.slice(1));
    fields.push({ key: 'values', label: 'Brand Values', value: capitalised });
  }

  // Voice description
  const voiceMatch = text.match(/voice[:\s]+["']?([^."'\n]+)/i);
  if (voiceMatch) {
    fields.push({ key: 'voice', label: 'Brand Voice', value: voiceMatch[1].trim() });
  }

  return fields;
}

/** Step 4a: Visual Preferences */
export function parseVisualPreferences(text: string): ParsedField[] {
  const fields: ParsedField[] = [];
  const lower = text.toLowerCase();

  // Color mood
  for (const [keyword, mood] of Object.entries(COLOR_MOODS)) {
    if (lower.includes(keyword)) {
      fields.push({ key: 'colorMood', label: 'Color Mood', value: `${keyword} — ${mood}` });
      break;
    }
  }

  // Visual style
  const styleMatch = VISUAL_STYLES.find((s) => lower.includes(s));
  if (styleMatch) {
    fields.push({ key: 'visualStyle', label: 'Visual Style', value: styleMatch });
  }

  // Hex color codes
  const hexMatches = text.match(/#[0-9a-fA-F]{3,8}/g);
  if (hexMatches && hexMatches.length > 0) {
    fields.push({ key: 'customColors', label: 'Colors', value: hexMatches });
  }

  // Style notes
  if (text.trim().length > 15) {
    fields.push({ key: 'styleNotes', label: 'Style Notes', value: text.trim() });
  }

  return fields;
}
