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
  Layout,
  Palette,
  Type,
  Printer,
  Globe,
  Wand2,
  FileStack,
  Bell,
  Beaker,
  Crown,
} from 'lucide-react';
import { submitEarlyAccess } from '@/lib/supabase';

/**
 * MultiStepEarlyAccess — 5-step early-access signup form (v5.1).
 *
 * Engagement-optimized question order. The email is LAST, after the
 * user has already invested effort in 4 quick clicks — by then the
 * commitment cost of one more step (their email) feels trivial.
 *
 *   Step 1 — Role         "What brings you here?"
 *   Step 2 — First brand  "What would you build first?"
 *   Step 3 — Excited about "Which feature gets you most excited?"
 *   Step 4 — Tester level "Want to help shape Brand OS?"
 *   Step 5 — Email        "Where should we send your invite?"
 *
 * All non-email steps use chip selectors for fast tapping. Each step
 * is illustrated with a Lucide icon so it doesn't feel like a survey.
 *
 * Submits to Supabase via lib/supabase.ts using the new schema columns
 * `interesting_feature` and `tester_interest`.
 */

const ROLES = [
  { id: 'Founder', icon: Compass, label: 'Founder', tag: 'Building my own thing' },
  { id: 'Designer', icon: PenTool, label: 'Designer', tag: 'Crafting brands for clients' },
  { id: 'Marketer', icon: Megaphone, label: 'Marketer', tag: 'Running campaigns and content' },
  { id: 'Agency / Studio', icon: Briefcase, label: 'Agency / Studio', tag: 'Managing many brands' },
  { id: 'Other', icon: User, label: 'Something else', tag: "I'll tell you later" },
] as const;

const FEATURES = [
  { id: 'guidelines', icon: Layout, label: 'Live brand guidelines' },
  { id: 'design-studio', icon: Palette, label: 'Design studio' },
  { id: 'print', icon: Printer, label: 'Print & collateral' },
  { id: 'website', icon: Globe, label: 'Website builder' },
  { id: 'ai', icon: Wand2, label: 'AI brand assistant' },
  { id: 'export', icon: FileStack, label: 'One-click brand export' },
  { id: 'typography', icon: Type, label: 'Typography & voice' },
] as const;

const TESTER_LEVELS = [
  {
    id: 'notify',
    icon: Bell,
    title: 'Just notify me',
    body: "Send one email when it's live. Nothing else.",
  },
  {
    id: 'beta',
    icon: Beaker,
    title: 'I want to test the beta',
    body: 'Get early access and help shape it with feedback.',
  },
  {
    id: 'founder',
    icon: Crown,
    title: 'Sign me up for the founder list',
    body: 'First in line. Lifetime supporter perks.',
  },
] as const;

type Role = (typeof ROLES)[number]['id'];
type Feature = (typeof FEATURES)[number]['id'];
type TesterLevel = (typeof TESTER_LEVELS)[number]['id'];

const TOTAL_STEPS = 5;

const stepVariants = {
  enter: { opacity: 0, x: 28 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -28 },
};

const stepTransition = {
  duration: 0.35,
  ease: [0.22, 1, 0.36, 1] as const,
};

export function MultiStepEarlyAccess() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [role, setRole] = useState<Role | null>(null);
  const [useCase, setUseCase] = useState('');
  const [feature, setFeature] = useState<Feature | null>(null);
  const [testerLevel, setTesterLevel] = useState<TesterLevel | null>(null);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleNext = useCallback(() => {
    setStep((s) => Math.min(TOTAL_STEPS, s + 1) as 1 | 2 | 3 | 4 | 5);
  }, []);

  const handleBack = useCallback(() => {
    setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3 | 4 | 5);
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!isValidEmail) {
        setErrorMsg('Please enter a valid email address.');
        return;
      }
      setStatus('submitting');
      setErrorMsg(null);
      try {
        await submitEarlyAccess({
          email: email.trim(),
          role: role ?? undefined,
          use_case: useCase.trim() || undefined,
          interesting_feature: feature ?? undefined,
          tester_interest: testerLevel ?? undefined,
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
    [isValidEmail, email, role, useCase, feature, testerLevel],
  );

  // ─── Success state ──────────────────────────────────────────────
  if (status === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center text-center gap-5 py-8"
      >
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-foreground text-background shadow-elegant">
          <CheckCircle2 className="h-8 w-8" />
        </span>
        <div>
          <p className="font-display text-2xl font-bold text-foreground">
            You're on the list.
          </p>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            We'll send one email when Brand OS launches. Nothing else.
            Thanks for being early.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <div>
      {/* Progress bar */}
      <div className="flex items-center justify-center gap-1.5 mb-6">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
          const isCurrent = i + 1 === step;
          const isDone = i + 1 < step;
          return (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
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

      <p className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-6">
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
              First — what brings you here?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Just so we know who's getting early access.
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
                      // tiny delay for the click feedback before advancing
                      setTimeout(() => handleNext(), 220);
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

        {/* ── Step 2: Use case ──────────────────────────────────── */}
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
              What would you build with Brand OS first?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Be specific or vague — anything works. (Optional.)
            </p>

            <textarea
              autoFocus
              rows={4}
              placeholder="A new SaaS launch · a client rebrand · my coffee shop · the brand I always meant to make…"
              value={useCase}
              onChange={(e) => setUseCase(e.target.value)}
              className="input-area w-full mt-5"
            />

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button type="button" onClick={handleNext} className="btn-primary">
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Step 3: Most exciting feature ─────────────────────── */}
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
              Which part are you most excited about?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Pick the one that made you stop scrolling.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {FEATURES.map((f) => {
                const selected = feature === f.id;
                const Icon = f.icon;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFeature(f.id)}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-medium transition-all duration-200 ${
                      selected
                        ? 'border-accent-pop bg-accent-pop text-white'
                        : 'border-border bg-background text-foreground hover:border-foreground/40'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {f.label}
                  </button>
                );
              })}
            </div>

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
                disabled={!feature}
                className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:bg-foreground disabled:hover:text-background disabled:hover:border-0"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Step 4: Tester level ──────────────────────────────── */}
        {step === 4 && (
          <motion.div
            key="step-4"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={stepTransition}
          >
            <h3 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              Want to help shape Brand OS?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Pick what fits — it changes when you'll get access.
            </p>

            <div className="mt-6 grid gap-2.5">
              {TESTER_LEVELS.map((t) => {
                const selected = testerLevel === t.id;
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTesterLevel(t.id)}
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
                      <p className="text-sm font-semibold text-foreground">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.body}</p>
                    </div>
                  </button>
                );
              })}
            </div>

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
                disabled={!testerLevel}
                className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:bg-foreground disabled:hover:text-background disabled:hover:border-0"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Step 5: Email (LAST) ──────────────────────────────── */}
        {step === 5 && (
          <motion.form
            key="step-5"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={stepTransition}
            onSubmit={handleSubmit}
            noValidate
          >
            <h3 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              Last one. Where should we send it?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Just one email when we launch. No newsletter, no spam.
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
                disabled={!isValidEmail || status === 'submitting'}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:bg-foreground disabled:hover:text-background disabled:hover:border-0"
              >
                {status === 'submitting' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting…
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
