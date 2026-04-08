/**
 * Mock provider — always-available, zero-config. Generates plausible
 * brand-grounded responses by reading the current brand object.
 *
 * Replace with `claudeProvider` (uses @anthropic-ai/sdk) when an API key
 * is configured. Behind a feature flag.
 */
import type { AssistantProvider, AssistantReply, AssistantSendInput } from '../types';

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

const TAGLINE_TEMPLATES = [
  '{brand} — {value}, {value2}, {value3}.',
  'The {tone} way to {audience_verb}.',
  '{brand}: built for {audience}.',
  'Your {audience} deserves better. Meet {brand}.',
  '{brand}. {value}, made simple.',
];

const VOICE_HINTS = [
  'Lead with verbs. Cut adjectives.',
  'Talk like one expert friend would talk to another.',
  'Specifics over abstractions. Numbers over claims.',
  'Confident, never loud. Calm, never cold.',
];

async function delay<T>(value: T, ms = 600): Promise<T> {
  return new Promise((res) => setTimeout(() => res(value), ms));
}

function answerForBrand(input: AssistantSendInput): string {
  const { message, brand } = input;
  const text = message.toLowerCase();

  if (!brand) {
    return "I don't see an active brand. Open a brand from the workspace and ask me again — I'll have full context then.";
  }

  if (/voice|tone|sound/.test(text)) {
    return `${brand.name}'s voice is **${brand.tone}**, speaking to **${brand.audience}**.\n\n${pick(VOICE_HINTS)}\n\nA quick test: read your sentence aloud. Does it sound like ${brand.tone}? If not, cut it.`;
  }

  if (/tagline|headline|slogan/.test(text)) {
    const v1 = brand.guidelines?.strategy?.values?.[0] ?? 'craft';
    const v2 = brand.guidelines?.strategy?.values?.[1] ?? 'clarity';
    const v3 = brand.guidelines?.strategy?.values?.[2] ?? 'momentum';
    const lines = TAGLINE_TEMPLATES.slice(0, 4).map((t) =>
      t
        .replaceAll('{brand}', brand.name)
        .replaceAll('{value}', v1)
        .replaceAll('{value2}', v2)
        .replaceAll('{value3}', v3)
        .replaceAll('{tone}', brand.tone)
        .replaceAll('{audience}', brand.audience)
        .replaceAll('{audience_verb}', 'move forward'),
    );
    return `Here are 4 tagline directions for **${brand.name}**:\n\n${lines.map((l, i) => `${i + 1}. ${l}`).join('\n')}\n\nWant me to push any of them harder?`;
  }

  if (/color|palette/.test(text)) {
    const sec = brand.secondaryColor ? ` and **${brand.secondaryColor}** as accent` : '';
    return `${brand.name} uses **${brand.primaryColor}** as the primary${sec}. Use the primary for the most important action on every screen — only one. The accent is for highlights, never large surfaces.`;
  }

  if (/logo/.test(text)) {
    const has = brand.logo || brand.logoAssets?.full ? 'has' : 'does not have';
    return `${brand.name} ${has} a logo on file. Open **Identity → Logo** to upload variants (full, icon, dark, light) — variants are what let the logo work in every context.`;
  }

  if (/asset|library|dam/.test(text)) {
    const count = brand.assets?.length ?? 0;
    return `${brand.name} has **${count} asset${count === 1 ? '' : 's'}** in its library. Open **Assets** in the brand sidebar to upload more, organize by category, or download in different formats.`;
  }

  if (/audience|customer|user/.test(text)) {
    return `${brand.name} is built for **${brand.audience}**. Every screen, every word, every visual choice should make them feel: "this is for me." If a sentence in your copy could belong to a different audience, rewrite it.`;
  }

  if (/strategy|positioning|mission|vision/.test(text)) {
    const s = brand.guidelines?.strategy;
    if (s) {
      return `**${brand.name}** strategy:\n\n- **Mission:** ${s.mission}\n- **Vision:** ${s.vision}\n- **Positioning:** ${s.positioning}\n- **Values:** ${s.values?.join(', ')}`;
    }
    return `${brand.name} doesn't have a full strategy in the system yet. Open **Identity → Strategy** to define mission, vision, and positioning — the assistant gets dramatically sharper once those exist.`;
  }

  // Default: a thoughtful, brand-aware reflection
  return `Thinking about **${brand.name}** in the context of "${message}"…\n\nWith a tone of **${brand.tone}** and an audience of **${brand.audience}**, I'd lead with a statement that proves you understand them — then show, don't tell. Want me to draft something specific?`;
}

export const mockProvider: AssistantProvider = {
  name: 'mock',
  send: async (input) => {
    const reply: AssistantReply = { content: answerForBrand(input) };
    return delay(reply, 500 + Math.random() * 600);
  },
};
