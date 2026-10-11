/**
 * Step 7 — the brand hub.
 *
 * The identity is already saved to a real brand; this page is the handover.
 * Every deliverable is listed in the folder it ships in, each format is its
 * own download, and one button takes the whole package as a zip. The doors
 * into the product (Brand Kit, Guidelines, Design, Setup) are the brand's own
 * pages — this flow does not keep a second copy of anything.
 */
import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { DsButton, DsEyebrow, DsProgress } from '@/shared/ds';
import { useBrandStore } from '@/shared/store/brandStore';
import { useLogoFlow } from '../model/flowStore';
import { BrandBoard } from '../components/BrandBoard';
import { LogoMark } from '../components/LogoMark';
import { GROUPS, buildZip, packageCatalog, slugify, type Deliverable, type DeliverableFile } from '../export/package';
import { logoVariations } from '../engine/logoArt';
import { svgDataUrl } from '../engine/logoRead';
import { graphicElements } from '../engine/graphics';

function saveFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function PackageStep() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const then = sp.get('then');
  const logo = useLogoFlow((s) => s.logo);
  const system = useLogoFlow((s) => s.system);
  const context = useLogoFlow((s) => s.context);
  const committed = useLogoFlow((s) => s.committed);
  const reset = useLogoFlow((s) => s.reset);
  const brand = useBrandStore((s) => s.list.find((b) => b.id === committed?.brandId) ?? null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [busyFile, setBusyFile] = useState<string | null>(null);
  const [zip, setZip] = useState<{ done: number; total: number; label: string } | null>(null);

  const catalog = useMemo(() => (logo && system ? packageCatalog({ logo, system, context }) : []), [logo, system, context]);
  if (!logo || !system || !committed) return null;
  const slug = committed.slug;
  const ctx = { logo, system, context, brand, board: () => boardRef.current };
  const total = catalog.reduce((n, d) => n + d.files.length, 0);

  const download = async (file: DeliverableFile) => {
    setBusyFile(file.name);
    try {
      saveFile(await file.build(ctx), file.name);
    } catch (err) {
      toast.error(`Couldn’t make ${file.name}: ${err instanceof Error ? err.message : 'unknown error'}`);
    } finally {
      setBusyFile(null);
    }
  };

  const downloadAll = async () => {
    setZip({ done: 0, total, label: 'Starting' });
    try {
      const { blob, report } = await buildZip(ctx, catalog, (done, t, label) => setZip({ done, total: t, label }));
      saveFile(blob, `${slugify(context.name)}-brand.zip`);
      if (report.skipped.length) toast.warning(`${report.skipped.length} file(s) were left out: ${report.skipped.map((s) => s.name).join(', ')}`);
      else toast.success(`${report.count} files downloaded.`);
    } catch {
      toast.error('The package could not be built. Each file can still be downloaded on its own.');
    } finally {
      setZip(null);
    }
  };

  // Leave FIRST, then drop the draft. Resetting while this screen is still
  // mounted trips its own guard, which bounces to step 1 before the
  // navigation lands.
  const leave = () => setTimeout(reset, 0);
  const open = () => {
    navigate(then ?? `/b/${slug}/setup`);
    leave();
  };

  const variations = logoVariations(system);
  const thumb = (d: Deliverable) => {
    const p = system.palette;
    const v = variations.find((x) => `logo-${x.id}` === d.id);
    if (v) {
      return (
        <span className="lf-thumb" style={{ background: v.ground ?? (v.ink === '#ffffff' ? p.dark : p.light) }}>
          <LogoMark logo={logo} color={v.ink} height={18} />
        </span>
      );
    }
    switch (d.group) {
      case 'colour':
        return (
          <span className="lf-thumb lf-thumb-strip">
            {(['primary', 'secondary', 'accent', 'dark'] as const).map((r) => (
              <span key={r} style={{ background: p[r] }} />
            ))}
          </span>
        );
      case 'type':
        return (
          <span className="lf-thumb" style={{ background: p.light, color: p.primary, fontFamily: `"${system.type.heading}"`, fontWeight: system.type.headingWeight }}>
            Aa
          </span>
        );
      case 'graphics':
        return (
          <span className="lf-thumb" style={{ background: '#fff' }}>
            <img src={svgDataUrl(graphicElements(system.motif, p, system.corner)[0].svg)} alt="" />
          </span>
        );
      default:
        return (
          <span className="lf-thumb" style={{ background: d.group === 'social' ? p.primary : p.dark }}>
            <LogoMark logo={logo} color="#ffffff" height={16} />
          </span>
        );
    }
  };

  return (
    <div className="lf-package">
      <section className="lf-hub-head">
        <div>
          <DsEyebrow>{system.directionName}</DsEyebrow>
          <h2>{context.name}</h2>
          <p>
            Saved to your workspace with its logo system, colours, type, voice and rules. {total} files across {GROUPS.length} folders.
          </p>
        </div>
        <div className="lf-hub-actions">
          <DsButton tone="secondary" onClick={downloadAll} disabled={!!zip}>
            {zip ? 'Building package…' : 'Download everything (.zip)'}
          </DsButton>
          <DsButton tone="primary" arrow onClick={open}>
            Open {context.name}
          </DsButton>
        </div>
      </section>
      {zip && <DsProgress value={zip.total ? zip.done / zip.total : 0} label={zip.label} meta={`${zip.done} / ${zip.total}`} />}

      <BrandBoard ref={boardRef} name={context.name} logo={logo} system={system} />

      <nav className="lf-doors" aria-label="Continue in BrandingOS">
        {[
          { to: `/b/${slug}/brand-kit`, title: 'Brand Kit', body: 'Stationery, social, web and decks — generated from this brand.' },
          { to: `/b/${slug}/guideline`, title: 'Guidelines builder', body: 'A 30-page brand book you can edit page by page.' },
          { to: `/b/${slug}/design`, title: 'Design', body: 'Start designing with your brand loaded.' },
          { to: `/b/${slug}/setup`, title: 'Brand setup', body: 'Everything you decided, editable at any time.' },
        ].map((door) => (
          <Link key={door.to} to={door.to} className="lf-door" onClick={leave}>
            <strong>{door.title} →</strong>
            <span>{door.body}</span>
          </Link>
        ))}
      </nav>

      {GROUPS.map((g) => {
        const items = catalog.filter((d) => d.group === g.id);
        if (!items.length) return null;
        return (
          <section key={g.id} className="lf-group" aria-labelledby={`lf-group-${g.id}`}>
            <header>
              <h3 id={`lf-group-${g.id}`}>{g.title}</h3>
              <span className="lf-group-folder">{g.folder}</span>
            </header>
            <p className="lf-group-desc">{g.description}</p>
            <ul className="lf-deliverables">
              {items.map((d) => (
                <li key={d.id} className="lf-deliverable" data-testid={`deliverable-${d.id}`}>
                  {thumb(d)}
                  <div className="lf-deliverable-meta">
                    <strong>{d.name}</strong>
                    <span>{d.description}</span>
                  </div>
                  <div className="lf-formats">
                    {d.files.map((f) => (
                      <DsButton
                        key={f.name}
                        tone="secondary"
                        size="sm"
                        title={f.name}
                        aria-label={`Download ${f.name}`}
                        disabled={busyFile === f.name || !!zip}
                        onClick={() => void download(f)}
                      >
                        {busyFile === f.name ? '…' : f.label ?? f.format}
                      </DsButton>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {!logo.svgText && (
        <p className="lf-note">
          Your logo came in as a raster image, so logo files are high-resolution PNGs. Upload an SVG version from Brand setup to get true vectors.
        </p>
      )}
    </div>
  );
}
