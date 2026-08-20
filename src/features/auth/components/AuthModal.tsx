import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { Mail, Lock, User, Eye, EyeOff, Loader2, MailCheck, KeyRound } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { FaGoogle } from 'react-icons/fa';
import { useSessionStore } from '@/shared/store/sessionStore';
import { toast } from 'sonner';
import {
  DEV_AUTH_BYPASS,
  DEV_BYPASS_USER,
  DEV_BYPASS_STORAGE_KEY,
  signInWithPassword,
  signUp,
  signInWithGoogle,
  sendPasswordReset,
  verifySignupCode,
  resendSignupCode,
  SIGNUP_CODE_LENGTH,
} from '../session/authController';
import { safeNext } from '../session/safeNext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
  /** Where to land after a successful sign-in. Defaults to the guarded page
   *  that redirected here (`location.state.from`), else /dashboard. */
  next?: string;
}

export function AuthModal({ isOpen, onClose, defaultMode = 'login', next }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(defaultMode);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<{ kind: 'reset'; email: string } | null>(null);
  // Sign-up must be confirmed with the code e-mailed to the address before
  // the user may enter the app. While this is set the modal shows the code
  // panel instead of the form.
  const [pendingCode, setPendingCode] = useState<{ email: string } | null>(null);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });

  // Sync internal mode with prop when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
      setSubmitting(false);
      setSentTo(null);
      setPendingCode(null);
      setCode('');
    }
  }, [isOpen, defaultMode]);

  // Resend cooldown ticker (Supabase also rate-limits sends server-side).
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const { signIn: storeSignIn, setPlatformRole } = useSessionStore();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = safeNext(next ?? (location.state as { from?: string } | null)?.from);

  // Dev-only: signs in locally without touching Supabase at all. Only rendered
  // when DEV_AUTH_BYPASS is true, which is itself hard-gated to DEV builds.
  const handleDevBypass = () => {
    localStorage.setItem(DEV_BYPASS_STORAGE_KEY, '1');
    storeSignIn(DEV_BYPASS_USER);
    setPlatformRole('super_admin');
    toast.success('Signed in as local dev user — Supabase skipped');
    onClose();
    navigate(destination, { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    try {
      if (mode === 'login') {
        if (!formData.email || !formData.password) {
          toast.error('Please enter your email and password');
          return;
        }
        const result = await signInWithPassword(formData.email.trim(), formData.password);
        if (result.error) {
          if (result.code === 'email_not_confirmed') {
            // The account exists but was never confirmed — send a fresh code
            // and let them finish here instead of dead-ending on an error.
            const email = formData.email.trim();
            const sent = await resendSignupCode(email);
            if (sent.error) { toast.error(sent.error); return; }
            setPendingCode({ email });
            setCode('');
            setResendIn(60);
            return;
          }
          toast.error(result.error);
          return;
        }
        // The controller has already flipped the store to authenticated AND
        // swapped services to Supabase — safe to navigate right away.
        toast.success('Welcome back!');
        onClose();
        navigate(destination, { replace: true });
      } else if (mode === 'register') {
        if (!formData.email || !formData.password) {
          toast.error('Please fill in all required fields');
          return;
        }
        if (formData.password.length < 6) {
          toast.error('Password must be at least 6 characters');
          return;
        }
        const result = await signUp(formData.email.trim(), formData.password, formData.name);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        if (result.needsEmailConfirmation) {
          // No session yet — the account exists but must be confirmed with
          // the code we just e-mailed. Stay here; do NOT navigate to a
          // guarded page that would only bounce back.
          setPendingCode({ email: formData.email.trim() });
          setCode('');
          setResendIn(60);
          return;
        }
        toast.success('Welcome to BrandOS!');
        onClose();
        navigate(destination, { replace: true });
      } else if (mode === 'forgot') {
        if (!formData.email) {
          toast.error('Please enter your email address');
          return;
        }
        const result = await sendPasswordReset(formData.email.trim());
        if (result.error) {
          toast.error(result.error);
          return;
        }
        setSentTo({ kind: 'reset', email: formData.email.trim() });
      }
    } catch (error: any) {
      toast.error(error?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyCode = async (value = code) => {
    if (!pendingCode || verifying || value.length !== SIGNUP_CODE_LENGTH) return;
    setVerifying(true);
    try {
      const result = await verifySignupCode(pendingCode.email, value);
      if (result.error) {
        toast.error(result.error);
        setCode('');
        return;
      }
      toast.success('Email confirmed — welcome to BrandOS!');
      onClose();
      navigate(destination, { replace: true });
    } finally {
      setVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!pendingCode || resendIn > 0) return;
    const result = await resendSignupCode(pendingCode.email);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('A new code is on its way.');
    setResendIn(60);
  };

  const handleGoogleLogin = async () => {
    if (submitting) return;
    setSubmitting(true);
    const result = await signInWithGoogle(destination);
    if (result.error) {
      toast.error(result.error);
      setSubmitting(false);
    }
    // On success the browser leaves for Google; nothing more to do here.
  };

  const resetForm = () => {
    setFormData({ email: '', password: '', name: '' });
  };

  const switchMode = (newMode: 'login' | 'register' | 'forgot') => {
    setMode(newMode);
    resetForm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-display">
            {pendingCode ? 'Confirm your email' : (
              <>
                {mode === 'login' && 'Welcome back'}
                {mode === 'register' && 'Create your account'}
                {mode === 'forgot' && 'Reset password'}
              </>
            )}
          </DialogTitle>
          {/* The one place a signed-out visitor can be told this: /dashboard is
              behind ProtectedRoute, so its empty state never reaches them. */}
          {!pendingCode && mode === 'register' && (
            <p className="text-center text-sm text-muted-foreground">
              We'll set you up with a demo brand — logos, colours, type,
              guidelines and a kit — so you can see how everything works before
              putting your own brand in.
            </p>
          )}
        </DialogHeader>

        <Card className="border-0 shadow-none">
          <div className="p-6 pt-0">
            {pendingCode ? (
              <div className="text-center space-y-5 py-2" data-testid="auth-code-panel">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <KeyRound className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    We sent a {SIGNUP_CODE_LENGTH}-digit code to{' '}
                    <span className="font-medium text-foreground">{pendingCode.email}</span>.
                    Enter it below to finish creating your account.
                  </p>
                </div>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={SIGNUP_CODE_LENGTH}
                    value={code}
                    onChange={(v) => {
                      const digits = v.replace(/\D/g, '');
                      setCode(digits);
                      if (digits.length === SIGNUP_CODE_LENGTH) void handleVerifyCode(digits);
                    }}
                    inputMode="numeric"
                    autoFocus
                    disabled={verifying}
                    aria-label="Confirmation code"
                    containerClassName="gap-2"
                  >
                    <InputOTPGroup>
                      {Array.from({ length: SIGNUP_CODE_LENGTH }, (_, i) => (
                        <InputOTPSlot key={i} index={i} className="h-12 w-11 text-lg" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button
                  type="button"
                  className="w-full h-11"
                  disabled={verifying || code.length !== SIGNUP_CODE_LENGTH}
                  onClick={() => void handleVerifyCode()}
                >
                  {verifying ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Confirming...</>) : 'Confirm'}
                </Button>
                <div className="text-sm text-muted-foreground">
                  Didn't get it?{' '}
                  <button
                    type="button"
                    className="text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                    disabled={resendIn > 0}
                    onClick={() => void handleResendCode()}
                  >
                    {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
                  </button>
                  <span className="mx-2">·</span>
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => { setPendingCode(null); setCode(''); switchMode('login'); }}
                  >
                    Use a different email
                  </button>
                </div>
              </div>
            ) : sentTo ? (
              <div className="text-center space-y-4 py-2" data-testid="auth-sent-panel">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <MailCheck className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium">Check your inbox</p>
                  <p className="text-sm text-muted-foreground">
                    We sent a password reset link to{' '}
                    <span className="font-medium text-foreground">{sentTo.email}</span>.
                    Open it to choose a new password.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => { setSentTo(null); switchMode('login'); }}
                >
                  Back to sign in
                </Button>
              </div>
            ) : (
            <>
            {mode !== 'forgot' && (
              <>
                <div className="space-y-3 mb-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 gap-3"
                    onClick={handleGoogleLogin}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FaGoogle className="w-4 h-4" />
                    )}
                    Continue with Google
                  </Button>

                  {DEV_AUTH_BYPASS && mode === 'login' && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full h-11 gap-2 border border-dashed border-amber-500 text-amber-700 dark:text-amber-400"
                      onClick={handleDevBypass}
                      disabled={submitting}
                    >
                      Dev bypass (skip Supabase)
                    </Button>
                  )}
                </div>

                <div className="relative mb-6">
                  <Separator />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-background px-3 text-sm text-muted-foreground">
                      or continue with email
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="username"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {mode !== 'forgot' && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="pl-10 pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 mt-6"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {mode === 'login' ? 'Signing in...' :
                     mode === 'register' ? 'Creating account...' :
                     'Sending email...'}
                  </>
                ) : (
                  mode === 'login' ? 'Sign In' :
                  mode === 'register' ? 'Create Account' :
                  'Send Reset Email'
                )}
              </Button>
            </form>

            {/* Guest mode removed — all users must authenticate */}

            {/* Footer Links */}
            <div className="mt-6 text-center text-sm">
              {mode === 'login' && (
                <>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                  <div className="mt-2">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('register')}
                      className="text-primary hover:underline"
                    >
                      Sign up
                    </button>
                  </div>
                </>
              )}

              {mode === 'register' && (
                <div>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="text-primary hover:underline"
                  >
                    Sign in
                  </button>
                </div>
              )}

              {mode === 'forgot' && (
                <div>
                  Remember your password?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="text-primary hover:underline"
                  >
                    Sign in
                  </button>
                </div>
              )}
            </div>
            </>
            )}
          </div>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
