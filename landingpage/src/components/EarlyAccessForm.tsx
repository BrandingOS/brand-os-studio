import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Loader2 } from 'lucide-react';

/**
 * Early Access signup form.
 *
 * Default behavior: stores submitted emails in localStorage and shows a
 * success state. Replace `submitEmail()` with a real backend call before
 * launch — see comments for the easiest options.
 *
 * Variants:
 *  - "inline"  → horizontal pill input + button (used in HeroSection)
 *  - "stacked" → vertical, larger (used in FinalCTASection)
 */

interface EarlyAccessFormProps {
  variant?: 'inline' | 'stacked';
  buttonLabel?: string;
  placeholder?: string;
}

const STORAGE_KEY = 'brandos:early-access-emails';

async function submitEmail(email: string): Promise<void> {
  // ─── REPLACE THIS WITH A REAL BACKEND CALL BEFORE LAUNCH ───────────
  //
  // Easiest options (pick one and uncomment):
  //
  // 1) Formspree (no backend needed)
  //    await fetch('https://formspree.io/f/YOUR_FORM_ID', {
  //      method: 'POST',
  //      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  //      body: JSON.stringify({ email }),
  //    });
  //
  // 2) Resend Audiences (transactional email by Vercel)
  //    await fetch('/api/early-access', {
  //      method: 'POST',
  //      headers: { 'Content-Type': 'application/json' },
  //      body: JSON.stringify({ email }),
  //    });
  //
  // 3) Supabase
  //    import { createClient } from '@supabase/supabase-js';
  //    const supabase = createClient(URL, ANON_KEY);
  //    await supabase.from('early_access').insert({ email });
  //
  // 4) Mailchimp / ConvertKit / Beehiiv embed form
  //    Replace this whole component with the embed snippet from your provider.
  //
  // ─── END BACKEND HOOKUP ─────────────────────────────────────────────

  // Default fallback: stash in localStorage so you don't lose signups in dev.
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(existing) || !existing.includes(email)) {
      const next = [...(Array.isArray(existing) ? existing : []), email];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  } catch {
    // Ignore localStorage errors (private mode, quota, etc).
  }

  // Tiny artificial delay so the loading state is visible during dev.
  await new Promise((r) => setTimeout(r, 400));
}

export function EarlyAccessForm({
  variant = 'inline',
  buttonLabel = 'Get Early Access',
  placeholder = 'you@company.com',
}: EarlyAccessFormProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus('error');
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setStatus('submitting');
    setErrorMsg(null);

    try {
      await submitEmail(trimmed);
      setStatus('success');
    } catch (err) {
      console.error('Early access submit failed:', err);
      setStatus('error');
      setErrorMsg('Something went wrong. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <div
        className={
          variant === 'inline'
            ? 'mx-auto max-w-md flex items-center justify-center gap-2 rounded-full border border-border bg-secondary/60 px-5 py-3 text-sm'
            : 'mx-auto max-w-md flex items-center justify-center gap-2 rounded-2xl border border-border bg-secondary/60 px-6 py-4 text-sm'
        }
      >
        <CheckCircle2 className="h-4 w-4 text-foreground" />
        <span className="text-foreground font-medium">You're on the list.</span>
        <span className="text-muted-foreground hidden sm:inline">
          We'll be in touch soon.
        </span>
      </div>
    );
  }

  if (variant === 'stacked') {
    return (
      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-md space-y-3"
        data-animate
        noValidate
      >
        <Input
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          className="w-full input-pill h-12 px-5 text-center focus:placeholder-transparent"
          placeholder={placeholder}
          aria-label="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === 'submitting'}
        />
        <Button
          type="submit"
          variant="hero"
          shape="pill"
          className="h-12 px-8 w-full"
          disabled={status === 'submitting'}
        >
          {status === 'submitting' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
            </>
          ) : (
            buttonLabel
          )}
        </Button>
        {errorMsg && (
          <p className="text-xs text-destructive text-center">{errorMsg}</p>
        )}
      </form>
    );
  }

  // inline variant (default)
  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-md flex flex-col md:flex-row items-center gap-2 justify-center"
      data-animate
      noValidate
    >
      <Input
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        className="w-full md:w-64 input-pill h-12 px-5 text-center focus:placeholder-transparent"
        placeholder={placeholder}
        aria-label="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={status === 'submitting'}
      />
      <Button
        type="submit"
        variant="hero"
        shape="pill"
        className="h-12 px-6 w-full md:w-auto"
        disabled={status === 'submitting'}
      >
        {status === 'submitting' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
          </>
        ) : (
          buttonLabel
        )}
      </Button>
      {errorMsg && (
        <p className="text-xs text-destructive w-full text-center md:text-left">
          {errorMsg}
        </p>
      )}
    </form>
  );
}
