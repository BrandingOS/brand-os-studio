// Deterministic, free signals over a compiled brief.
//
// This is the CI gate, and it is deliberately the ONLY thing allowed to fail a
// run: a multimodal critic is a non-deterministic judge, and a judge that can
// turn the build red on its own will eventually do so for no reason.
//
// Each signal is a rule a senior art director would check on a brief before
// sending it — is there an idea, is there a hierarchy, does it know what it is
// making — plus the two failure modes measured on the old pipeline: a brief
// that was 92% identical across deliverables, and one that spent 40% of its
// words forbidding things.

export interface BriefTask {
  userPrompt: string;
  copy: { headline?: string; subhead?: string; cta?: string } | null;
  kind: 'design' | 'image' | 'auto';
}

const has = (s: string, re: RegExp) => (re.test(s) ? 1 : 0);

export function scoreBrief(prompt: string, negativePrompt: string, task: BriefTask): Record<string, number> {
  const words = prompt.split(/\s+/).length;

  // How much of the brief is prohibition. Attention spent NOT drawing is
  // attention not spent drawing, and a long ban list reads as emphasis.
  const banBlock = /(AVOID|DO NOT INCLUDE)[\s\S]*$/i.exec(prompt)?.[0] ?? '';
  const prohibitionShare = banBlock.split(/\s+/).length / Math.max(1, words);

  const copyLines = task.copy
    ? [task.copy.headline, task.copy.subhead, task.copy.cta].filter(Boolean) as string[]
    : [];

  return {
    // Is it asking for a DESIGN, or describing a picture?
    saysFinished: has(prompt, /finished, publication-ready|publication-ready composition/i),
    refusesBackdrop: has(prompt, /NOT an empty background|must NOT be an empty background/i),

    // Does it know what it is making, and how that thing is read?
    namesHowItIsRead: has(prompt, /read (at|from|once|full-screen|close|in passing)/i),
    namesConventions: has(prompt, /At most \d+ words|no detail smaller than|survive a centre crop|platform draws its own controls/i),
    setsTypeFloor: has(prompt, /Set nothing smaller than [\d.]+% of the frame height/i),

    // Is there an idea, or only a subject?
    hasConcept: has(prompt, /^CONCEPT — /m),

    // Direction a designer could act on.
    directsHierarchy: has(prompt, /dominant|reading order|eye lands/i),
    directsColourRoles: has(prompt, /Ground — the largest surface|Type and primary marks/i),
    directsLight: has(prompt, /LIGHT & FINISH —/) && !has(prompt, /considered lighting/i) ? 1 : 0,
    hasSafeMargin: has(prompt, /\d+% safe margin/),

    // The copy contract.
    quotesExactCopy: copyLines.length
      ? (copyLines.every((c) => prompt.includes(c)) ? 1 : 0)
      : 1,
    bansInventedFacts: has(`${prompt} ${negativePrompt}`, /invented prices, percentages, dates or claims|discount badges/i),
    noPlaceholderReserve: task.kind !== 'image' && !copyLines.length
      ? has(prompt, /do NOT reserve, mask or flatten any area/i)
      : 1,

    // A wordless image must not be told how to set type.
    wordlessStaysWordless: task.kind === 'image'
      ? (has(prompt, /TEXT — none/) && !has(prompt, /set real, legible type/i) ? 1 : 0)
      : 1,

    // Measured failure modes.
    notProhibitionHeavy: prohibitionShare < 0.2 ? 1 : 0,
    notBloated: words < 320 ? 1 : 0,
  };
}
