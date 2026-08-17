import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Eye, EyeOff, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useSessionStore } from '@/shared/store/sessionStore';
import { updatePassword } from '@/features/auth/session/authController';
import { takeAuthCallbackError, describeAuthCallbackError } from '@/integrations/supabase/callbackError';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // An expired/used link arrives as ?error=…&error_code=otp_expired (moved
  // out of the URL before the Supabase client booted — see callbackError.ts).
  const [linkError] = useState<string | null>(() => {
    const e = takeAuthCallbackError();
    return e ? describeAuthCallbackError(e) : null;
  });
  const isAuthenticated = useSessionStore((st) => st.isAuthenticated);
  const isLoading = useSessionStore((st) => st.isLoading);
  const recovery = useSessionStore((st) => st.recovery);
  const userEmail = useSessionStore((st) => st.user?.email ?? '');

  // A reset link is valid when the auth controller saw PASSWORD_RECOVERY, or
  // the link carried a recovery hash / PKCE code and we now hold a session.
  // Otherwise (a stale link, or someone typing the URL) it's invalid.
  const cameFromLink =
    window.location.hash.includes('type=recovery') || new URLSearchParams(window.location.search).has('code');
  const isValidLink = !linkError && (recovery || (cameFromLink && isAuthenticated));
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 6000);
    return () => clearTimeout(t);
  }, []);
  const checking = !linkError && !isValidLink && !timedOut && (isLoading || cameFromLink);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      if (!useSessionStore.getState().isAuthenticated) {
        toast.error('This reset link has expired. Please request a new one.');
        navigate('/login');
        return;
      }
      const result = await updatePassword(password);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Password updated successfully!');
      navigate('/dashboard', { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isValidLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-display">Invalid Reset Link</CardTitle>
            <CardDescription>
              {linkError ?? 'This password reset link has expired or is invalid. Please request a new one.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate('/login')}>
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-display">Reset Your Password</CardTitle>
          <CardDescription>
            {userEmail
              ? <>Set a new password for <span className="font-medium text-foreground">{userEmail}</span></>
              : 'Enter your new password below'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
            {/* Hidden email field for password managers */}
            {userEmail && (
              <input
                type="email"
                name="username"
                autoComplete="username"
                value={userEmail}
                readOnly
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
              />
            )}

            {userEmail && (
              <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2.5 text-sm text-muted-foreground">
                <Mail className="w-4 h-4 shrink-0" />
                <span className="truncate">{userEmail}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="new-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                  minLength={6}
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  name="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 mt-6"
              disabled={submitting}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Updating...</>
              ) : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
