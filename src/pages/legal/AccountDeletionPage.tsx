import { Link } from 'react-router-dom';

export default function AccountDeletionPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        <header className="border-b border-border pb-8 mb-10">
          <Link
            to="/"
            className="inline-block text-xs font-bold tracking-widest uppercase text-primary mb-4 hover:opacity-80"
          >
            BrandingOS
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Account &amp; Data Deletion
          </h1>
          <p className="text-sm text-muted-foreground">Last updated: April 15, 2026</p>
        </header>

        <div className="space-y-4 leading-relaxed">
          <p>
            You have the right to delete your BrandingOS account and all associated personal data at
            any time. This page explains how.
          </p>

          <h2 className="text-xl font-semibold mt-10 mb-3">Option 1 — In-App Deletion (fastest)</h2>
          <ol className="list-decimal pl-6 space-y-2">
            <li>
              Sign in at{' '}
              <a
                href="https://x.brandingos.ai"
                className="text-primary underline underline-offset-2"
              >
                x.brandingos.ai
              </a>
              .
            </li>
            <li>
              Go to <strong>Settings → Account</strong>.
            </li>
            <li>
              Click <strong>Delete Account</strong> and confirm.
            </li>
            <li>
              Your account and all brand data (logos, colors, guidelines, designs, uploads) will be
              permanently erased within 7 days.
            </li>
          </ol>

          <h2 className="text-xl font-semibold mt-10 mb-3">Option 2 — Email Request</h2>
          <p>If you can't access your account, email us from the address tied to it:</p>
          <div className="rounded-lg border border-border bg-muted/40 border-l-4 border-l-primary p-5 my-6 space-y-2">
            <p>
              <strong>To:</strong>{' '}
              <a
                href="mailto:hamza2007ezzat@gmail.com?subject=Account%20Deletion%20Request"
                className="text-primary underline underline-offset-2"
              >
                hamza2007ezzat@gmail.com
              </a>
            </p>
            <p>
              <strong>Subject:</strong> Account Deletion Request
            </p>
            <p>
              <strong>Include:</strong> the email address on your account. We'll delete everything
              within 30 days and confirm by email.
            </p>
          </div>

          <h2 className="text-xl font-semibold mt-10 mb-3">What gets deleted</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Your user profile (name, email, avatar, auth identifiers).</li>
            <li>All brands you created — logos, color palettes, typography, guidelines, saved designs.</li>
            <li>All uploaded assets and media.</li>
            <li>All OAuth tokens issued by Google / Facebook / other providers.</li>
            <li>Session data and authentication records.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-10 mb-3">What may be retained</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Billing records</strong> — if you ever made a purchase, we retain invoices for
              up to 7 years as required by tax law.
            </li>
            <li>
              <strong>Anonymized analytics</strong> — aggregated, non-identifying usage statistics.
            </li>
          </ul>

          <h2 className="text-xl font-semibold mt-10 mb-3">Deletion from third parties</h2>
          <p>
            If you signed in with Facebook, revoking BrandingOS access on Facebook does{' '}
            <strong>not</strong> automatically delete your BrandingOS account. You must use one of
            the options above. You can separately revoke the Facebook authorization at{' '}
            <a
              href="https://www.facebook.com/settings?tab=business_tools"
              className="text-primary underline underline-offset-2"
            >
              facebook.com/settings/business_tools
            </a>
            .
          </p>

          <h2 className="text-xl font-semibold mt-10 mb-3">Contact</h2>
          <p>
            Questions about data deletion? Email{' '}
            <a
              href="mailto:hamza2007ezzat@gmail.com"
              className="text-primary underline underline-offset-2"
            >
              hamza2007ezzat@gmail.com
            </a>
            .
          </p>
        </div>

        <footer className="mt-14 pt-6 border-t border-border text-sm text-muted-foreground">
          © 2026 BrandingOS. All rights reserved. ·{' '}
          <Link to="/" className="text-primary underline underline-offset-2">
            Home
          </Link>{' '}
          ·{' '}
          <Link to="/privacy" className="text-primary underline underline-offset-2">
            Privacy Policy
          </Link>
        </footer>
      </div>
    </div>
  );
}
