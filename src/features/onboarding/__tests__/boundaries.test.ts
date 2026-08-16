/**
 * The boundaries onboarding must not cross.
 *
 * Asserted by reading the feature's own source rather than by exercising it: a
 * behavioural test only catches a violation on the path it happens to run, and
 * these are claims about what the code is ALLOWED to reach at all.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd(), 'src/features/onboarding');

function sources(dir = ROOT, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== '__tests__') sources(full, out);
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const FILES = sources();
const read = (f: string) => readFileSync(f, 'utf8');
const rel = (f: string) => f.slice(process.cwd().length + 1);

describe('FR-030 — onboarding generates no deliverables', () => {
  it('has no import path to Kit adoption', () => {
    // Onboarding writes Core, Library, Business Info and Context. Adopting into
    // the Official Kit is a separate, explicit act the user performs later.
    const offenders = FILES.filter((f) => /IKitAdoptionService|kitAdoption|KIT_ADOPTIONS/.test(read(f)));
    expect(offenders.map(rel)).toEqual([]);
  });

  it('has no import path to design storage or the editor', () => {
    const offenders = FILES.filter((f) =>
      /IDesignStorage|DESIGN_STORAGE|features\/editor|features\/brand-kit\//.test(read(f)),
    );
    expect(offenders.map(rel)).toEqual([]);
  });

  it('never reaches for guidelines or templates', () => {
    const offenders = FILES.filter((f) => /ITemplatesService|features\/guideline/.test(read(f)));
    expect(offenders.map(rel)).toEqual([]);
  });
});

describe('FR-026 — no brand material on the brand record', () => {
  it('never writes the inline asset arrays', () => {
    // `assets`, `brandAssets` and `logoAssets` are the stores 001 retired.
    // Material belongs in the Library; logos are logoSystem references.
    const offenders = FILES.filter((f) =>
      /\b(assets|brandAssets|logoAssets)\s*:/.test(
        read(f)
          // The Library service call legitimately mentions `assets` as a local.
          .replace(/const assets = container[^;]+;/g, '')
          // …and legitimately names it as a PARAMETER. The rule is about
          // writing an array onto a brand record, not about the word.
          .replace(/\bassets\s*:\s*IAssetsService/g, '')
          .replace(/brandAssets\?\.\w+/g, ''),
      ),
    );
    expect(offenders.map(rel)).toEqual([]);
  });

  it('never persists a data URL as brand material', () => {
    const offenders = FILES.filter((f) => /['"`]data:image\//.test(read(f)));
    expect(offenders.map(rel)).toEqual([]);
  });
});

describe('contracts §2 — interpretation stays pure', () => {
  const interpret = read(join(ROOT, 'understanding/interpret.ts'));

  it('imports no service, store or container', () => {
    // Purity is what makes the mapping testable without a database and why it
    // can never accidentally promote anything.
    expect(interpret).not.toMatch(/ServiceContainer|SERVICE_KEYS|useBrandStore|useOnboardingStore/);
  });

  it('imports no React', () => {
    expect(interpret).not.toMatch(/from 'react'/);
  });

  it('performs no navigation and raises no toast', () => {
    expect(interpret).not.toMatch(/useNavigate|sonner|toast/);
  });
});

describe('contracts §4 — one promoter', () => {
  it('acceptance.ts is the ONLY module that calls promoteCoreValue', () => {
    const callers = FILES.filter((f) => /promoteCoreValue\s*\(/.test(read(f))).map(rel);
    expect(callers).toEqual(['src/features/onboarding/understanding/acceptance.ts']);
  });

  it('nothing in the feature can ask for official', () => {
    // `official` is Kit adoption, which this flow does not perform. The target
    // is hard-coded to 'confirmed' and no call site may widen it.
    const offenders = FILES.filter((f) => /['"]official['"]/.test(read(f)));
    expect(offenders.map(rel)).toEqual([]);
  });

  it('no acceptance is reachable from a render path', () => {
    // Reading is never accepting: acceptance must not be called from an effect,
    // an observer or a scroll handler.
    const offenders = FILES.filter((f) => {
      const src = read(f);
      if (!/acceptProposal|acceptAll|editValue/.test(src)) return false;
      return /useEffect\([^)]*(acceptProposal|acceptAll|editValue)/s.test(src)
        || /IntersectionObserver/.test(src)
        || /addEventListener\('scroll'/.test(src);
    });
    expect(offenders.map(rel)).toEqual([]);
  });
});

describe('the sentinel never leaks into the feature as a value', () => {
  it('no module hardcodes the placeholder hex or family', () => {
    // Everything must go through CORE_PLACEHOLDERS so there is one definition
    // and one place the "is this chosen?" question is answered.
    const offenders = FILES.filter(
      (f) => !f.endsWith('createBrand.ts') && /#8A877E|'system-ui'/.test(read(f)),
    );
    expect(offenders.map(rel)).toEqual([]);
  });
});
