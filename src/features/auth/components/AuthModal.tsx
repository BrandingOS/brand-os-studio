import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { Mail, Lock, User, Eye, EyeOff, Loader2, MailCheck } from 'lucide-react';
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
  const [sentTo, setSentTo] = useState<{ kind: 'confirm' | 'reset'; email: string } | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  });

  // Sync internal mode with prop when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
      setSubmitting(false);
      setSentTo(null);
    }
  }, [isOpen, defaultMode]);

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
        if (formData.password !== formData.confirmPassword) {
          toast.error('Passwords do not match');
          return;
        }
        const result = await signUp(formData.email.trim(), formData.password, formData.name);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        if (result.needsEmailConfirmation) {
          // No session yet — the account exists but must be confirmed by
          // the link we just sent. Stay here and say so; do NOT navigate
          // to a guarded page that would only bounce back.
          setSentTo({ kind: 'confirm', email: formData.email.trim() });
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
    setFormData({ email: '', password: '', name: '', confirmPassword: '' });
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
            {mode === 'login' && 'Welcome back'}
            {mode === 'register' && 'Create your account'}
            {mode === 'forgot' && 'Reset password'}
          </DialogTitle>
        </DialogHeader>

        <Card className="border-0 shadow-none">
          <div className="p-6 pt-0">
            {sentTo ? (
              <div className="text-center space-y-4 py-2" data-testid="auth-sent-panel">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <MailCheck className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium">
                    {sentTo.kind === 'confirm' ? 'Confirm your email' : 'Check your inbox'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    We sent a {sentTo.kind === 'confirm' ? 'confirmation' : 'password reset'} link to{' '}
                    <span className="font-medium text-foreground">{sentTo.email}</span>.
                    {sentTo.kind === 'confirm'
                      ? ' Open it to finish creating your account.'
                      : ' Open it to choose a new password.'}
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

              {mode === 'register' && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="pl-10"
                      required
                    />
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
