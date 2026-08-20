import { useState, useCallback, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Sparkles,
  PenTool,
  Megaphone,
  Briefcase,
  User,
  Compass,
  Beaker,
  Bell,
  SmilePlus,
  PartyPopper,
} from 'lucide-react';
import { submitEarlyAccess } from '@/domains/landing/lib/earlyAccess';

const ROLES = [
  { id: 'Founder', icon: Compass, label: 'Founder', tag: 'Building my own thing' },
  { id: 'Designer', icon: PenTool, label: 'Designer', tag: 'Crafting brands for clients' },
  { id: 'Marketer', icon: Megaphone, label: 'Marketer', tag: 'Running campaigns and content' },
  { id: 'Agency / Studio', icon: Briefcase, label: 'Agency / Studio', tag: 'Managing many brands' },
  { id: 'Other', icon: User, label: 'Something else', tag: '' },
] as const;

const ACCESS_OPTIONS = [
  { id: 'beta', icon: Beaker, label: 'Join early & give feedback' },
  { id: 'notify', icon: Bell, label: "Notify me when it's ready" },
] as const;

type Role = (typeof ROLES)[number]['id'];
type AccessLevel = (typeof ACCESS_OPTIONS)[number]['id'];

const TOTAL_STEPS = 4;

const stepVariants = {
  enter: { opacity: 0, x: 24 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
};
const stepTransition = { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const };

export function MultiStepEarlyAccess() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [role, setRole] = useState<Role | null>(null);
  const [otherRole, setOtherRole] = useState('');
  const [showOtherField, setShowOtherField] = useState(false);
  const [accessLevel, setAccessLevel] = useState<AccessLevel | null>(null);
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
      if (!name.trim()) { setErrorMsg('We need something to call you!'); return; }
      setStatus('submitting');
      setErrorMsg(null);
      try {
        const finalRole = role === 'Other' && otherRole.trim()
          ? `Other: ${otherRole.trim()}`
          : (role ?? undefined);
        await submitEarlyAccess({
          email: email.trim(),
          name: name.trim() || undefined,
          role: finalRole,
          tester_interest: accessLevel ?? undefined,
        });
        setStatus('success');
      } catch (err) {
        console.error('Early access submit failed:', err);
        setStatus('error');
        setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      }
    },
    [email, role, otherRole, accessLevel, name],
  );

  if (status === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="ea-success relative flex flex-col items-center text-center gap-5 py-10 overflow-hidden"
      >
        <div className="ea-confetti" aria-hidden="true">
          {Array.from({ length: 18 }).map((_, i) => (
            <span key={i} className="ea-particle" style={{
              left: `${8 + Math.random() * 84}%`,
              animationDelay: `${Math.random() * 0.8}s`,
              animationDuration: `${1.4 + Math.random() * 1.2}s`,
              backgroundColor: ['hsl(var(--accent-pop))', 'hsl(var(--foreground))', '#fbbf24', '#34d399', '#f87171', '#a78bfa'][i % 6],
              width: `${4 + Math.random() * 5}px`,
              height: `${4 + Math.random() * 5}px`,
            }} />
          ))}
        </div>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }}
        >
          <span className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-accent-pop text-white shadow-elegant">
            <PartyPopper className="h-9 w-9" />
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            {name ? `Welcome aboard, ${name}!` : "You're on the list!"}
          </p>
          <p className="mt-3 text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            We'll reach out as soon as BrandingOS is ready for you.
            <br />
            Thanks for being one of the early ones.
          </p>
        </motion.div>

        <style>{`
          .ea-confetti { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
          .ea-particle {
            position: absolute; bottom: -10px; border-radius: 50%;
            animation: ea-rise ease-out forwards;
            opacity: 0;
          }
          @keyframes ea-rise {
            0%   { transform: translateY(0) scale(1); opacity: 0; }
            10%  { opacity: 1; }
            80%  { opacity: 0.8; }
            100% { transform: translateY(-320px) scale(0.4) rotate(180deg); opacity: 0; }
          }
        `}</style>
      </motion.div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-center gap-1.5 mb-5">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i + 1 === step ? 'w-12 bg-accent-pop'
              : i + 1 < step ? 'w-2 bg-foreground'
              : 'w-2 bg-border'
            }`}
          />
        ))}
      </div>
      <p className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-5">
        Step {step} of {TOTAL_STEPS}
      </p>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="s1" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={stepTransition}>
            <h3 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">What do you do?</h3>
            <p className="mt-2 text-sm text-muted-foreground">So we know who's signing up.</p>

            <div className="mt-6 grid gap-2.5">
              {ROLES.map((r) => {
                const selected = role === r.id;
                const Icon = r.icon;
                const isOther = r.id === 'Other';
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setRole(r.id);
                      if (isOther) {
                        setShowOtherField(true);
                      } else {
                        setShowOtherField(false);
                        setTimeout(() => handleNext(), 140);
                      }
                    }}
                    className={`group flex items-center gap-4 rounded-2xl p-4 text-left transition-all duration-200 border ${
                      selected ? 'border-accent-pop bg-[hsl(var(--accent-pop-soft))]' : 'border-border bg-background hover:border-foreground/40'
                    }`}
                  >
                    <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      selected ? 'bg-accent-pop text-white' : 'bg-muted text-foreground'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{r.label}</p>
                      {r.tag && <p className="text-xs text-muted-foreground">{r.tag}</p>}
                    </div>
                  </button>
                );
              })}
            </div>

            <AnimatePresence>
              {showOtherField && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 flex gap-2">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Tell us what you do..."
                      value={otherRole}
                      onChange={(e) => setOtherRole(e.target.value)}
                      className="input-pill flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={!otherRole.trim()}
                      className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="s2" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={stepTransition}>
            <h3 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              When do you want access?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">Choose one:</p>

            <div className="mt-6 grid gap-2.5">
              {ACCESS_OPTIONS.map((opt) => {
                const selected = accessLevel === opt.id;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setAccessLevel(opt.id);
                      setTimeout(() => handleNext(), 140);
                    }}
                    className={`group flex items-center gap-4 rounded-2xl p-4 text-left transition-all duration-200 border ${
                      selected ? 'border-accent-pop bg-[hsl(var(--accent-pop-soft))]' : 'border-border bg-background hover:border-foreground/40'
                    }`}
                  >
                    <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      selected ? 'bg-accent-pop text-white' : 'bg-muted text-foreground'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                  </button>
                );
              })}
            </div>

            <div className="mt-6">
              <button type="button" onClick={handleBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="s3" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={stepTransition}>
            <h3 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              What's your email?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              We'll send you one email when BrandingOS is ready.
            </p>
            <input
              type="email" inputMode="email" autoComplete="email" autoFocus required
              placeholder="you@example.com" value={email}
              onChange={(e) => { setEmail(e.target.value); if (errorMsg) setErrorMsg(null); }}
              className="input-pill w-full mt-6"
            />
            <div className="mt-8 flex items-center justify-between">
              <button type="button" onClick={handleBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button type="button" onClick={handleNext} disabled={!isValidEmail}
                className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:bg-foreground disabled:hover:text-background disabled:hover:border-0">
                Next <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.form key="s4" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={stepTransition} onSubmit={handleSubmit} noValidate>
            <div className="flex items-center gap-2 mb-1">
              <SmilePlus className="h-5 w-5 text-accent-pop" />
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-pop">Last thing</span>
            </div>
            <h3 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              What should we call you?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Just your first name — so we can say hi properly.
            </p>
            <input
              type="text" autoComplete="given-name" autoFocus required
              placeholder="Your first name" value={name}
              onChange={(e) => { setName(e.target.value); if (errorMsg) setErrorMsg(null); }}
              className="input-pill w-full mt-6"
            />
            {errorMsg && <p className="mt-2 text-xs text-destructive">{errorMsg}</p>}
            <div className="mt-8 flex items-center justify-between">
              <button type="button" onClick={handleBack} disabled={status === 'submitting'}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button type="submit" disabled={!name.trim() || status === 'submitting'}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:bg-foreground disabled:hover:text-background disabled:hover:border-0">
                {status === 'submitting' ? (<><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>) : (<>Save my spot <Sparkles className="h-4 w-4" /></>)}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
