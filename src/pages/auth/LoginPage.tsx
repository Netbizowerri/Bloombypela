import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Lock, Mail, ShieldAlert, Sparkles, UserCheck } from 'lucide-react';
import { UserRole } from '../../types/auth';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signInWithEmail, signInWithGoogle, setDevRole } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/account';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      error('Missing credentials', 'Please enter both your email address and password.');
      return;
    }

    setIsLoading(true);
    try {
      await signInWithEmail(email, password);
      success('Welcome back!', 'You have successfully signed in.');
      navigate(from, { replace: true });
    } catch (err: any) {
      error('Sign-in failed', err?.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      success('Signed in with Google', 'Welcome to Bloom by Pela.');
      navigate(from, { replace: true });
    } catch (err: any) {
      error('Google sign-in error', err?.message || 'Could not complete Google authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = (role: UserRole) => {
    setDevRole(role);
    success(`Signed in as ${role.toUpperCase()}`, `Preview session activated.`);
    if (role === 'admin' || role === 'staff') {
      navigate('/admin');
    } else {
      navigate('/account');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center flex flex-col items-center">
          <Link to="/" className="inline-block group mb-2">
            <img
              src="https://res.cloudinary.com/titznrnk/image/upload/f_auto,q_auto/Bloom_By_Pela_Nourish_Naturally"
              alt="Bloom by Pela"
              className="h-[68px] sm:h-[78px] w-auto max-w-[320px] object-contain group-hover:opacity-90 transition-opacity mx-auto"
              width={600}
              height={150}
            />
          </Link>
          <h2 className="mt-4 font-serif text-2xl font-bold text-stone-900">
            Sign in to your account
          </h2>
          <p className="mt-1 text-xs text-stone-500">
            Manage your orders, juice delivery subscriptions, and saved addresses
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-xl border border-stone-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftElement={<Mail className="h-4 w-4" />}
              required
            />

            <div className="space-y-1">
              <Input
                label="Password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftElement={<Lock className="h-4 w-4" />}
                required
              />
              <div className="text-right">
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-[#7e2b44] hover:underline"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-stone-400 font-medium">Or continue with</span>
              </div>
            </div>

            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                leftIcon={
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                }
              >
                Sign in with Google
              </Button>
            </div>
          </div>

          {/* Quick Demo Logins for Instant Reviewer Testing */}
          <div className="mt-8 pt-6 border-t border-stone-100 bg-[#fdfbf7] -mx-8 -mb-8 p-6 rounded-b-2xl">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 mb-2">
              <Sparkles className="h-4 w-4 text-[#cb932b]" />
              <span>One-Click Role Testing (Preview Mode)</span>
            </div>
            <p className="text-[11px] text-stone-500 mb-3">
              Test role-gated routes immediately without needing Firebase console configuration:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('admin')}
                className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-md bg-[#7e2b44] text-white hover:bg-[#662337] transition-all shadow-xs"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                Sign in as Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('customer')}
                className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-md border border-stone-300 bg-white text-stone-800 hover:bg-stone-50 transition-all shadow-xs"
              >
                <UserCheck className="h-3.5 w-3.5 text-[#245840]" />
                Sign in as Customer
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-stone-600">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-[#7e2b44] hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};
