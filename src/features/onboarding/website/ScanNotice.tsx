/**
 * What the scan did, said once, above the review.
 *
 * Nothing here is an error state: a partial read is a report of work done, a
 * missed site is a report of what still stands, an unread strategy is a
 * report of what needs credits. `DsBanner` carries the next step; the row
 * beneath shows the parts the user cares about. Approved at Gate 2.
 */
import { DsBanner } from '@/shared/ds';
import './website.css';

export interface ScanReport {
  host: string;
  status: 'complete' | 'partial' | 'failed';
  /** Why a failed scan failed, in the user's language. */
  reason?: string;
  reasonCode?: string;
  /** Pages that did not load, by role label ("About page"). */
  missedPages: string[];
  found: { logo: boolean; colors: boolean; fonts: boolean; socials: boolean };
  /** Why the copy was not interpreted, when it was not. */
  aiSkipped?: 'no_copy' | 'not_authenticated' | 'insufficient_credits' | 'timeout' | 'malformed' | 'ai_failed';
}

interface Props {
  report: ScanReport;
  onRetry(): void;
  onAddCredits(): void;
}

function Row({ parts }: { parts: Array<[string, boolean]> }) {
  return (
    <ul className="wi-scan-row" aria-label="What we read">
      {parts.map(([label, ok]) => (
        <li key={label} data-ok={ok ? 'true' : 'false'}>
          <span className="wi-scan-dot" aria-hidden="true" />
          {label}
          {ok ? '' : ' — not read'}
        </li>
      ))}
    </ul>
  );
}

export function ScanNotice({ report, onRetry, onAddCredits }: Props) {
  const { host, status, found } = report;
  const readRow: Array<[string, boolean]> = [
    ['Homepage', status !== 'failed'],
    ['Logo', found.logo],
    ['Colours', found.colors],
    ['Fonts', found.fonts],
    ['Social links', found.socials],
  ];

  if (status === 'failed') {
    return (
      <div className="wi-notice" data-testid="scan-notice" data-status="failed">
        <DsBanner tone="warning" actionLabel="Try again" onAction={onRetry}>
          {report.reason ?? `We couldn't reach ${host} just now.`} Your brief and uploads are here, and you can add the site later in Setup.
        </DsBanner>
      </div>
    );
  }

  const aiOut = report.aiSkipped && report.aiSkipped !== 'no_copy';
  if (aiOut) {
    const money = report.aiSkipped === 'insufficient_credits';
    return (
      <div className="wi-notice" data-testid="scan-notice" data-status="extracted-only">
        <DsBanner tone="neutral" actionLabel={money ? 'Add credits' : 'Try again'} onAction={money ? onAddCredits : onRetry}>
          <div>
            We read {host} — what it shows is in. Interpreting the copy{' '}
            {money ? 'needs AI credits, which this workspace has run out of.' : "didn't work just now."}
            <Row parts={[...readRow, ['Brand strategy', false]]} />
          </div>
        </DsBanner>
      </div>
    );
  }

  if (status === 'partial' && report.missedPages.length) {
    const missed = report.missedPages.join(' and ');
    return (
      <div className="wi-notice" data-testid="scan-notice" data-status="partial">
        <DsBanner tone="neutral" actionLabel="Try again" onAction={onRetry}>
          <div>
            We read {host}. The {missed} didn't load, so anything only it could say is still yours to add.
            <Row parts={[...readRow, ...report.missedPages.map((p): [string, boolean] => [p, false])]} />
          </div>
        </DsBanner>
      </div>
    );
  }

  return null;
}
