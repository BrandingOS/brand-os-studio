import { Link } from 'react-router-dom';

export default function PrivacyPage() {
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
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: April 15, 2026</p>
        </header>

        <div className="prose prose-invert max-w-none space-y-4 leading-relaxed">
          <p>
            BrandingOS ("we", "our", "us") respects your privacy. This policy explains what personal
            information we collect, how we use it, and the rights you have over it.
          </p>

          <h2 className="text-xl font-semibold mt-10 mb-3">1. Information We Collect</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Account data</strong> — name, email, profile picture, and authentication
              identifiers when you sign up directly or via Google / Facebook OAuth.
            </li>
            <li>
              <strong>Brand data</strong> — logos, colors, typography, brand guidelines, and other
              assets you upload or create within BrandingOS.
            </li>
            <li>
              <strong>Usage data</strong> — pages visited, features used, device and browser
              information, and timestamps.
            </li>
            <li>
              <strong>Cookies</strong> — to maintain your session and remember preferences.
            </li>
          </ul>

          <h2 className="text-xl font-semibold mt-10 mb-3">2. How We Use Your Information</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>To create and maintain your account and deliver the BrandingOS service.</li>
            <li>To authenticate you securely via Google, Facebook, or email/password.</li>
            <li>To send essential transactional emails (verification, password reset, billing).</li>
            <li>To improve product features, fix bugs, and respond to support requests.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-10 mb-3">3. Sharing &amp; Third Parties</h2>
          <p>
            We do <strong>not</strong> sell your personal data. We share information only with the
            service providers we rely on to operate BrandingOS:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Supabase</strong> — database, authentication, and file storage.</li>
            <li><strong>Cloudflare</strong> — hosting and DDoS protection.</li>
            <li><strong>Google &amp; Meta (Facebook)</strong> — OAuth identity providers.</li>
            <li><strong>Stripe</strong> — payment processing, if you upgrade to a paid plan.</li>
            <li><strong>Anthropic &amp; OpenAI</strong> — AI providers that power generation features.</li>
          </ul>

          <h2 className="text-xl font-semibold mt-10 mb-3">4. Data Retention</h2>
          <p>
            We keep your data for as long as your account is active. You can delete your account
            and all associated data at any time via the{' '}
            <Link to="/account-deletion" className="text-primary underline underline-offset-2">
              Account Deletion page
            </Link>
            .
          </p>

          <h2 className="text-xl font-semibold mt-10 mb-3">5. Your Rights</h2>
          <p>
            You have the right to access, correct, export, or delete your personal data. Contact us
            at{' '}
            <a
              href="mailto:hamza2007ezzat@gmail.com"
              className="text-primary underline underline-offset-2"
            >
              hamza2007ezzat@gmail.com
            </a>
            .
          </p>

          <h2 className="text-xl font-semibold mt-10 mb-3">6. Security</h2>
          <p>
            We use industry-standard encryption in transit (TLS) and at rest, and follow security
            best practices with our hosting providers.
          </p>

          <h2 className="text-xl font-semibold mt-10 mb-3">7. Children</h2>
          <p>
            BrandingOS is not directed to children under 13. We do not knowingly collect personal
            data from minors under 13.
          </p>

          <h2 className="text-xl font-semibold mt-10 mb-3">8. Changes to this Policy</h2>
          <p>
            We may update this policy to reflect changes in our practices or for legal reasons.
            Material changes will be communicated via email or a notice on the site.
          </p>

          <h2 className="text-xl font-semibold mt-10 mb-3">9. Contact</h2>
          <p>
            Questions? Email{' '}
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
          <Link to="/account-deletion" className="text-primary underline underline-offset-2">
            Account Deletion
          </Link>
        </footer>
      </div>
    </div>
  );
}
