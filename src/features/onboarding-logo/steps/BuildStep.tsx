/**
 * Step 6 — the brand is made real.
 *
 * Narrates only work that is actually running (the commit's own progress
 * callbacks), never a scripted animation. A failure keeps everything the owner
 * decided — the draft is untouched — and offers to try again.
 */
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { BrandMark, DsBanner, DsButton } from '@/shared/ds';
import { useBrandStore } from '@/shared/store/brandStore';
import { useSessionStore } from '@/shared/store/sessionStore';
import { useLogoFlow } from '../model/flowStore';
import { commitBrand } from '../persist/commitBrand';
import { packageCatalog } from '../export/package';

const PLAN = ['Creating the brand', 'Saving the logo system', 'Writing colours, type and voice', 'Finishing up'];

export function BuildStep({ onDone }: { onDone(): void }) {
  const createBrand = useBrandStore((s) => s.create);
  const updateBrand = useBrandStore((s) => s.update);
  const userId = useSessionStore((s) => s.user?.id);
  const [current, setCurrent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const run = async () => {
    const { logo, context, system, committed, setCommitted } = useLogoFlow.getState();
    if (committed) {
      onDone();
      return;
    }
    if (!logo || !system) return;
    setError(null);
    setCurrent(0);
    try {
      const result = await commitBrand(
        { logo, context, system },
        {
          create: createBrand as never,
          update: async (id, patch) => updateBrand(id, patch as never),
          live: (id) => useBrandStore.getState().list.find((b) => b.id === id),
          actor: { kind: 'human', userId: userId ?? 'unattributed' },
          onStep: (label) => setCurrent(Math.max(0, PLAN.indexOf(label))),
        },
      );
      // Re-read so everything downstream opens on the finished brand.
      await useBrandStore.getState().loadAll();
      setCommitted({ brandId: result.brand.id, slug: result.brand.slug });
      if (result.notSaved.length) toast.warning(`Couldn’t save ${result.notSaved.slice(0, 3).join(', ')}. Everything else is in your brand.`);
      setCurrent(PLAN.length);
      onDone();
    } catch (err) {
      console.error('[logo-flow] commit failed', err);
      started.current = false;
      setError(err instanceof Error ? err.message : 'Something went wrong creating the brand.');
    }
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { logo, system, context } = useLogoFlow.getState();
  const fileCount = logo && system ? packageCatalog({ logo, system, context }).reduce((n, d) => n + d.files.length, 0) : 0;

  return (
    <div className="lf-build" aria-live="polite">
      <BrandMark size={52} loading={!error} idle={!!error} />
      <ol className="lf-build-steps">
        {[...PLAN, `Preparing ${fileCount} files across 8 folders`].map((label, i) => (
          <li key={label} className={i < current ? 'is-done' : i === current && !error ? 'is-active' : ''}>
            <span className="lf-build-dot" aria-hidden="true" />
            {label}
          </li>
        ))}
      </ol>
      {error && (
        <DsBanner tone="danger">
          {error} Nothing you decided was lost.
        </DsBanner>
      )}
      {error && (
        <DsButton tone="primary" onClick={() => void run()}>
          Try again
        </DsButton>
      )}
    </div>
  );
}
