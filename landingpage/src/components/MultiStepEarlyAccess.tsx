import { useState, useCallback, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { submitEarlyAccess } from '@/lib/supabase';

/**
 * MultiStepEarlyAccess — 3-step early-access signup form.
 *
 * Step 1: email (required)
 * Step 2: role (optional, qualifying)
 * Step 3: use case (optional, free text)
 *
 * Submits directly to Supabase via the client in src/lib/supabase.ts.
 * Owned end-to-end by you — view signups in the Supabase dashboard.
 *
 * Variants:
 *   - "inline"  → compact mode, used in the hero
 *   - "stacked" → larger boxed mode, used in the final CTA section
 */

interface MultiStepEarlyAccessProps {
  variant?: 'inline' | 'stacked';
  ctaLabel?: string;
}

const ROLES = [
  'Founder',
  'Designer',
  'Marketer',
  'Agency / Studio',
  'Other',
] as const;
type Role = (typeof ROLES)[number];

const stepVariants = {
  enter: { opacity: 0, x: 20 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

const stepTransition = {
  duration: 0.35,
  ease: [0.22, 1, 0.36, 1] as const,
};

export function MultiStepEarlyAccess({
  variant = 'inline',
  ctaLabel = 'Get Early Access',
}: MultiStepEarlyAccessProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role | null>(null);
  const [useCase, setUseCase] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleEmailNext = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!isValidEmail) {
        setErrorMsg('Please enter a valid email address.');
        return;
      }
      setErrorMsg(null);
      setStep(2);
    },
    [isValidEmail],
  );

  const handleSubmit = useCallback(async () => {
    setStatus('submitting');
    setErrorMsg(null);
    try {
      await submitEarlyAccess({
        email: email.trim(),
        role: role ?? undefined,
        use_case: useCase.trim() || undefined,
      });
      setStatus('success');
    } catch (err) {
      console.error('Early access submit failed:', err);
      setStatus('error');
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.',
      );
    }
  }, [email, role, useCase]);

  const containerClass =
    variant === 'stacked'
      ? 'surface-glass rounded-2xl p-6 md:p-8 max-w-md mx-auto'
      : 'surface-glass rounded-2xl p-5 md:p-6 max-w-lg mx-auto';

  // ─── Success state ──────────────────────────────────────────────
  if (status === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className={containerClass}
      >
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <span className="relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet to-pink">
            <CheckCircle2 className="h-7 w-7 text-white" />
            <span className="absolute inset-0 rounded-full bg-gradient-to-br from-violet to-pink blur-xl opacity-60 -z-10" />
          </span>
          <div>
            <p className="text-lg font-bold text-foreground">
              You're on the list.
            </p>
            <p className="mt-1 text-sm text-fg-muted">
              We'll send one email when Brand OS launches.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // ─── Form ──────────────────────────────────────────────────────
  return (
    <div className={containerClass}>
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 mb-5">
        {[1, 2, 3].map((s) => (
          <span
            key={s}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              s === step
                ? 'w-8 bg-gradient-to-r from-violet to-pink'
                : s < step
                  ? 'w-1.5 bg-violet'
                  : 'w-1.5 bg-border'
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Step 1: Email ─────────────────────────────────────── */}
        {step === 1 && (
          <motion.form
            key="step-1"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={stepTransition}
            onSubmit={handleEmailNext}
            noValidate
          >
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">
                Step 1 of 3
              </span>
              <p className="mt-2 text-base font-semibold text-foreground">
                What's your email?
              </p>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                className="input-glow w-full mt-3"
              />
            </label>

            {errorMsg && (
              <p className="mt-2 text-xs text-pink">{errorMsg}</p>
            )}

            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                disabled={!isValidEmail}
                className="btn-glow disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.form>
        )}

        {/* ── Step 2: Role ──────────────────────────────────────── */}
        {step === 2 && (
          <motion.div
            key="step-2"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={stepTransition}
          >
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">
              Step 2 of 3
            </span>
            <p className="mt-2 text-base font-semibold text-foreground">
              What best describes you?
            </p>

            <div className="mt-3 grid gap-2">
              {ROLES.map((r) => {
                const selected = role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`group relative flex items-center justify-between rounded-full px-5 h-11 text-sm font-medium transition-all duration-200 border ${
                      selected
                        ? 'border-violet/60 bg-gradient-to-r from-violet/15 to-pink/15 text-foreground'
                        : 'border-border bg-bg-elevated text-fg-muted hover:border-border-bright hover:text-foreground'
                    }`}
                  >
                    <span>{r}</span>
                    {selected && (
                      <Sparkles className="h-4 w-4 text-violet" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="btn-glow"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Step 3: Use case + submit ─────────────────────────── */}
        {step === 3 && (
          <motion.div
            key="step-3"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={stepTransition}
          >
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">
              Step 3 of 3
            </span>
            <p className="mt-2 text-base font-semibold text-foreground">
              What would you use Brand OS for?
            </p>
            <p className="mt-1 text-xs text-fg-dim">
              A sentence or two — totally optional.
            </p>

            <textarea
              autoFocus
              rows={3}
              placeholder="A new SaaS, a client brand, redesigning my own…"
              value={useCase}
              onChange={(e) => setUseCase(e.target.value)}
              className="input-glow w-full mt-3 !rounded-2xl !h-auto py-3 resize-none"
            />

            {errorMsg && (
              <p className="mt-2 text-xs text-pink">{errorMsg}</p>
            )}

            <div className="mt-5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={status === 'submitting'}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-foreground transition-colors disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={status === 'submitting'}
                className="btn-glow disabled:opacity-70"
              >
                {status === 'submitting' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    {ctaLabel}
                    <Sparkles className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-4 text-center text-[11px] text-fg-dim">
        No spam — one launch email, then nothing until we ship.
      </p>
    </div>
  );
}
