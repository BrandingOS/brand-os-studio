/**
 * "We'll read northwind.studio" — the one line that tells the user their
 * website can do the work.
 *
 * Three faces, one component: an invitation when there is no address, the
 * address we found in the description (dismissable), or the address they
 * added as a link (which wins, with the description's address offered as an
 * alternative rather than silently dropped).
 *
 * DISPOSABLE — Gate 2 only.
 */

interface Props {
  /** The website the dropzone pill holds. Wins over anything detected. */
  pill?: string | null;
  /** A website address found in the description. */
  detected?: string | null;
  onDismiss(): void;
  onUseDetected(): void;
}

function Globe() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18Z" />
    </svg>
  );
}

export function DetectedSiteChip({ pill, detected, onDismiss, onUseDetected }: Props) {
  if (!pill && !detected) {
    return (
      <div className="wi-site wi-site--invite">
        <span className="wi-site-icon"><Globe /></span>
        <div className="wi-site-body">
          <p className="wi-site-line">Have a website? Paste the link below.</p>
          <p className="wi-site-sub">We'll read your logo, colours, fonts and copy so you don't have to describe them.</p>
        </div>
      </div>
    );
  }

  if (pill) {
    const other = detected && detected !== pill ? detected : null;
    return (
      <div className="wi-site" data-testid="site-chip" data-source="pill">
        <span className="wi-site-icon"><Globe /></span>
        <div className="wi-site-body">
          <p className="wi-site-line">We'll read <b>{pill}</b></p>
          <p className="wi-site-sub">
            The link you added.
            {other && (
              <>
                {' '}Your description also mentions {other}.
                <button type="button" onClick={onUseDetected}>Read that instead</button>
              </>
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="wi-site" data-testid="site-chip" data-source="description">
      <span className="wi-site-icon"><Globe /></span>
      <div className="wi-site-body">
        <p className="wi-site-line">We'll read <b>{detected}</b></p>
        <p className="wi-site-sub">Found in your description. Everything on it becomes your starting point.</p>
      </div>
      <button type="button" className="wi-site-dismiss" aria-label="Don't read this website" onClick={onDismiss}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}
