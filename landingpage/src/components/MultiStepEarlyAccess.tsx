import { useState, useCallback, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Sparkles,
  PenTool,
  Megaphone,
  Briefcase,
  User,
  Compass,
  Bell,
  Beaker,
  Hammer,
  SmilePlus,
} from 'lucide-react';
import { submitEarlyAccess } from '@/lib/supabase';

/**
 * MultiStepEarlyAccess — 4-step early-access signup form.
 *
 * Slimmed from 5 to 4 steps per user feedback:
 *   1. What do you do? (role — unchanged)
 *   2. How do you want to join? (rewritten tester level — charming)
 *   3. What is your email? (unchanged)
 *   4. What should we call you? (NEW — warm name question)
 *
 * Removed: step 2 (goal chips) + step 3 (favorite feature) — they
 * added friction without providing actionable signal.
 */

const ROLES = [
  { id: 'Founder', icon: Compass, label: 'Founder', tag: 'Building my own thing' },
  { id: 'Designer', icon: PenTool, label: 'Designer', tag: 'Crafting brands for clients' },
  { id: 'Marketer', icon: Megaphone, label: 'Marketer', tag: 'Running campaigns and content' },
  { id: 'Agency / Studio', icon: Briefcase, label: 'Agency / Studio', tag: 'Managing many brands' },
  { id: 'Other', icon: User, label: 'Something else', tag: "I'll tell you later" },
] as const;

const JOIN_OPTIONS = [
  {
    id: 'notify',
    icon: Bell,
    title: "Just ping me when it's ready",
    tag: "Low-key — I'll check it out later",
  },
  {
    id: 'beta',
    icon: Beaker,
    title: "I'd love to try it early and share my thoughts",
    tag: "Active — I like giving feedback",
  },
  {
    id: 'founder',
    icon: Hammer,
    title: 'I want to help shape it from the start',
    tag: "All-in — let's build this together",
  },
] as const;

type Role = (typeof ROLES)[number]['id'];
type JoinLevel = (typeof JOIN_OPTIONS)[number]['id'];

const TOTAL_STEPS = 4;

const stepVariants = {
  enter: { opacity: 0, x: 24 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
};

const stepTransition = {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1] as const,
};

export function MultiStepEarlyAccess() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [role, setRole] = useState<Role | null>(null);
  const [joinLevel, setJoinLevel] = useState<JoinLevel | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleNext = useCallback(() => {
    setStep((s) => Math.min(TOTAL_STEPS, s + 1) as 1 | 2 | 3 | 4);
  }, []);

  const handleBack = useCallback(() => {
    setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3 | 4);
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!name.trim()) {
        setErrorMsg('We need something to call you!');
        return;
      }
      setStatus('submitting');
      setErrorMsg(null);
      try {
        await submitEarlyAccess({
          email: email.trim(),
          role: role ?? undefined,
          tester_interest: joinLevel ?? undefined,
          // Name is passed in the use_case field since we don't have a
          // dedicated column yet. We prefix it so we can parse later.
          use_case: name.trim() ? `name:${name.trim()}` : undefined,
        });
        setStatus('success');
      } catch (err) {
        console.error('Early access submit failed:', err);
        setStatus('error');
        setErrorMsg(
          err instanceof Error ? err.message : 'Something went wrong. Please try again.',
        );
      }
    },
    [email, role, joinLevel, name],
  );

  // ─── Success state ──────────────────────────────────────────────
  if (status === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center text-center gap-5 py-8"
      >
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-foreground text-background shadow-elegant">
          <CheckCircle2 className="h-8 w-8" />
        </span>
        <div>
          <p className="font-display text-2xl font-bold text-foreground">
            You're on the list{name ? `, ${name}` : ''} ✨
          </p>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            We'll reach out when Brand OS is ready for you. Thanks for being early.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <div>
      {/* Progress bar */}
      <div className="flex items-center justify-center gap-1.5 mb-5">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
          const isCurrent = i + 1 === step;
          const isDone = i + 1 < step;
          return (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                isCurrent
                  ? 'w-12 bg-accent-pop'
                  : isDone
                    ? 'w-2 bg-foreground'
                    : 'w-2 bg-border'
              }`}
            />
          );
        })}
      </div>

      <p className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-5">
        Step {step} of {TOTAL_STEPS}
      </p>

      <AnimatePresence mode="wait">
        {/* ── Step 1: Role ───────────────────────────────────────── */}
        {step === 1 && (
          <motion.div
            key="step-1"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={stepTransition}
          >
            <h3 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              What do you do?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              So we know who's signing up.
            </p>

            <div className="mt-6 grid gap-2.5">
              {ROLES.map((r) => {
                const selected = role === r.id;
                const Icon = r.icon;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setRole(r.id);
                      setTimeout(() => handleNext(), 140);
                    }}
                    className={`group relative flex items-center gap-4 rounded-2xl p-4 text-left transition-all duration-200 border ${
                      selected
                        ? 'border-accent-pop bg-[hsl(var(--accent-pop-soft))]'
                        : 'border-border bg-background hover:border-foreground/40'
                    }`}
                  >
                    <span
                      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        selected
                          ? 'bg-accent-pop text-white'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{r.label}</p>
                      <p className="text-xs text-muted-foreground">{r.tag}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── Step 2: How do you want to join? (charming) ──────── */}
        {step === 2 && (
          <motion.div
            key="step-2"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={stepTransition}
          >
            <h3 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              How do you want to join?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This decides when and how you get access.
            </p>

            <div className="mt-6 grid gap-2.5">
              {JOIN_OPTIONS.map((opt) => {
                const selected = joinLevel === opt.id;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setJoinLevel(opt.id);
                      setTimeout(() => handleNext(), 140);
                    }}
                    className={`group relative flex items-center gap-4 rounded-2xl p-4 text-left transition-all duration-200 border ${
                      selected
                        ? 'border-accent-pop bg-[hsl(var(--accent-pop-soft))]'
                        : 'border-border bg-background hover:border-foreground/40'
                    }`}
                  >
                    <span
                      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        selected
                          ? 'bg-accent-pop text-white'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {opt.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{opt.tag}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Step 3: Email ─────────────────────────────────────── */}
        {step === 3 && (
          <motion.div
            key="step-3"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={stepTransition}
          >
            <h3 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              What's your email?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              We'll send you one email when Brand OS is ready.
            </p>

            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              className="input-pill w-full mt-6"
            />

            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={!isValidEmail}
                className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:bg-foreground disabled:hover:text-background disabled:hover:border-0"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Step 4: Name (last step — warm & friendly) ─────────── */}
        {step === 4 && (
          <motion.form
            key="step-4"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={stepTransition}
            onSubmit={handleSubmit}
            noValidate
          >
            <div className="flex items-center gap-2 mb-1">
              <SmilePlus className="h-5 w-5 text-accent-pop" />
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-pop">
                Last thing
              </span>
            </div>
            <h3 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              What should we call you?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Just your first name — so we can say hi properly.
            </p>

            <input
              type="text"
              autoComplete="given-name"
              autoFocus
              required
              placeholder="Your first name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              className="input-pill w-full mt-6"
            />

            {errorMsg && (
              <p className="mt-2 text-xs text-destructive">{errorMsg}</p>
            )}

            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={handleBack}
                disabled={status === 'submitting'}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="submit"
                disabled={!name.trim() || status === 'submitting'}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:bg-foreground disabled:hover:text-background disabled:hover:border-0"
              >
                {status === 'submitting' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    Save my spot
                    <Sparkles className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
