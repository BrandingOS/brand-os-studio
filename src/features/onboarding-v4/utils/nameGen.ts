const STOPWORDS = new Set(
  "the a an and or but with for of to in on at by is are was were be been have has had do does did will would can could should may might we you it this that these those my your our their not no so if as than then there here when where what who how why me its about from into out up down over under between more less all some any each every such very just like really im ive its".split(
    ' '
  )
);
const SUFFIXES = ['Studio', 'Labs', 'Works', 'Atelier', 'Kin', 'House', 'Collective', 'Form', 'Method', '& Co.', 'Goods'];
const LATIN_SUF = ['ium', 'ia', 'ora', 'era', 'oso', 'ary'];

const rand = (n: number) => Math.floor(Math.random() * n);
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const trimVowelEnd = (s: string) => s.replace(/[aeiou]+$/i, '') || s;

function extractWords(text: string): string[] {
  const words = (text.toLowerCase().match(/[a-zA-Z]{3,}/g) || []).filter((w) => !STOPWORDS.has(w));
  return Array.from(new Set(words));
}

export function generateNameSuggestions(description: string, count = 5): string[] {
  const words = extractWords(description);
  const pool = words.length ? words : ['brand', 'form', 'noor', 'studio'];
  const pickWord = () => pool[rand(pool.length)];

  const patterns: Array<() => string | null> = [
    () => cap(pickWord()) + ' ' + SUFFIXES[rand(SUFFIXES.length)],
    () => {
      const a = pickWord();
      const b = pickWord();
      if (a === b || !b) return null;
      return cap(a) + ' & ' + cap(b);
    },
    () => cap(pickWord()) + LATIN_SUF[rand(LATIN_SUF.length)],
    () => 'The ' + cap(pickWord()),
    () => 'Maison ' + cap(pickWord()),
    () => cap(pickWord()) + ' Co.',
    () => cap(trimVowelEnd(pickWord())),
    () => cap(pickWord()) + 'ly',
    () => cap(pickWord()) + 'a',
    () => cap(pickWord()) + ' / ' + cap(pickWord()).slice(0, 3).toUpperCase(),
  ];

  const out = new Set<string>();
  let tries = 0;
  while (out.size < count && tries < 80) {
    const p = patterns[rand(patterns.length)];
    let name: string | null = null;
    try {
      name = p();
    } catch {
      /* ignore */
    }
    if (name && name.length >= 3 && name.length <= 28) out.add(name);
    tries++;
  }
  return Array.from(out);
}
