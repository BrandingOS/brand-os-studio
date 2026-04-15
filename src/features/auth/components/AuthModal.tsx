import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { Mail, Lock, User, Eye, EyeOff, UserCheck } from 'lucide-react';
import { FaGoogle, FaFacebook } from 'react-icons/fa';
import { useAuth } from '../hooks/useAuth';
import { useSessionStore } from '@/shared/store/sessionStore';
import { toast } from 'sonner';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
}

export function AuthModal({ isOpen, onClose, defaultMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(defaultMode);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  });

  const { login, register, loginWithGoogle, loginWithFacebook, resetPassword, isLoading } = useAuth();
  const { switchToGuest } = useSessionStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (mode === 'login') {
        const result = await login(formData.email, formData.password);
        console.log('[AuthModal] Login result:', result);
        
        if (!result?.session) {
          toast.error('Login failed - no session created');
          return;
        }
        
        toast.success('Welcome back!');
        onClose();
        navigate('/dashboard');
      } else if (mode === 'register') {
        if (formData.password !== formData.confirmPassword) {
          toast.error('Passwords do not match');
          return;
        }
        await register(formData.email, formData.password, formData.name);
        toast.success('Account created! Please check your email to verify your account.');
        onClose();
        navigate('/dashboard');
      } else if (mode === 'forgot') {
        await resetPassword(formData.email);
        toast.success('Password reset email sent!');
        setMode('login');
      }
    } catch (error: any) {
      console.error('[AuthModal] Error:', error);
      toast.error(error.message || 'An error occurred');
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    try {
      if (provider === 'google') {
        await loginWithGoogle();
      } else {
        await loginWithFacebook();
      }
    } catch (error: any) {
      toast.error(error.message || 'Social login failed');
    }
  };

  const handleGuestMode = () => {
    switchToGuest();
    toast.success('Welcome! Exploring as guest');
    onClose();
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
            {mode !== 'forgot' && (
              <>
                <div className="space-y-3 mb-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 gap-3"
                    onClick={() => handleSocialLogin('google')}
                    disabled={isLoading}
                  >
                    <FaGoogle className="w-4 h-4" />
                    Continue with Google
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 gap-3"
                    onClick={() => handleSocialLogin('facebook')}
                    disabled={isLoading}
                  >
                    <FaFacebook className="w-4 h-4 text-[#1877F2]" />
                    Continue with Facebook
                  </Button>
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
                    type="email"
                    placeholder="admin@brandos.com"
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
                      type={showPassword ? 'text' : 'password'}
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
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 
                  mode === 'login' ? 'Sign In' :
                  mode === 'register' ? 'Create Account' :
                  'Send Reset Email'
                 }
               </Button>
             </form>

             {/* Guest Mode Button */}
             <div className="mt-4">
               <div className="relative mb-4">
                 <Separator />
                 <div className="absolute inset-0 flex items-center justify-center">
                   <span className="bg-background px-3 text-sm text-muted-foreground">
                     or
                   </span>
                 </div>
               </div>
               <Button
                 type="button"
                 variant="secondary"
                 className="w-full h-11 gap-2"
                 onClick={handleGuestMode}
                 disabled={isLoading}
               >
                 <UserCheck className="w-4 h-4" />
                 Continue as Guest
               </Button>
             </div>

             {/* Footer Links */}
             <div className="mt-6 text-center text-sm">{mode === 'login' && (
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
          </div>
        </Card>
      </DialogContent>
    </Dialog>
  );
}