/**
 * The Archive — /archive
 *
 * Parked chapters, kept ALIVE (full sections, not screenshots) so
 * ideas can be pulled back into the landing later. Everything here was
 * removed from the main page on 2026-08-20 at owner request.
 */
import { InputBeat } from '@/sections/Source';
import { Why } from '@/sections/Why';
import { Proof } from '@/sections/Proof';
import { System } from '@/sections/System';
import { Connection } from '@/sections/Connection';
import { Scale } from '@/sections/Scale';
import { Beliefs } from '@/sections/Beliefs';

export function ArchivePage() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <header className="container-tight flex items-baseline justify-between pb-6 pt-10">
        <span className="microlabel label-rule opacity-70">
          The Archive — parked sections
        </span>
        <a href="/" className="microlabel opacity-60 transition-opacity hover:opacity-100">
          ← Back to the page
        </a>
      </header>

      <main>
        {/* the reference → input beat (was inside One source) */}
        <section className="bg-panel text-panel-foreground" aria-label="Reference to input">
          <div className="container-tight pb-[14vh]">
            <InputBeat />
          </div>
        </section>

        <Why />
        <Proof />
        <System />
        <Connection />
        <Scale />
        <Beliefs />
      </main>
    </div>
  );
}
