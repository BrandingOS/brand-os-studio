/**
 * What the scan did, said once, above the review.
 *
 * Nothing here is an error state: a partial read is a report of work done, a
 * missed site is a report of what still stands. `DsBanner` carries the next
 * step; the row beneath shows the parts the user cares about.
 *
 * DISPOSABLE — Gate 2 only.
 */
import { DsBanner } from '@/shared/ds';
import { SITE, type Scenario } from './fixtures';

interface Props {
  scenario: Scenario;
  onRetry(): void;
  onAddCredits(): void;
}

function Row({ parts }: { parts: Array<[string, boolean]> }) {
  return (
    <ul className="wi-scan-row" aria-label="What we read">
      {parts.map(([label, ok]) => (
        <li key={label} data-ok={ok ? 'true' : 'false'}>
          <span className="wi-scan-dot" aria-hidden="true" />
          {label}{ok ? '' : ' — not read'}
        </li>
      ))}
    </ul>
  );
}

export function ScanNotice({ scenario, onRetry, onAddCredits }: Props) {
  if (scenario === 'complete') return null;

  if (scenario === 'partial') {
    return (
      <div className="wi-notice">
        <DsBanner tone="neutral" actionLabel="Try again" onAction={onRetry}>
          <div>
            We read {SITE.host}. The About page didn't load, so the mission and values are still yours to add.
            <Row parts={[['Homepage', true], ['Logo', true], ['Colours', true], ['Social links', true], ['About page', false]]} />
          </div>
        </DsBanner>
      </div>
    );
  }

  if (scenario === 'unavailable') {
    return (
      <div className="wi-notice">
        <DsBanner tone="warning" actionLabel="Try again" onAction={onRetry}>
          We couldn't reach {SITE.host} just now. Your brief and uploads are here, and you can add the site later in Setup.
        </DsBanner>
      </div>
    );
  }

  return (
    <div className="wi-notice">
      <DsBanner tone="neutral" actionLabel="Add credits" onAction={onAddCredits}>
        <div>
          We read {SITE.host} — your logo, colours, fonts and links are in. Interpreting the copy needs AI credits, which this workspace has run out of.
          <Row parts={[['Homepage', true], ['Logo', true], ['Colours', true], ['Fonts', true], ['Social links', true], ['Brand strategy', false]]} />
        </div>
      </DsBanner>
    </div>
  );
}
