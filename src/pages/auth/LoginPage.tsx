import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Lock, Mail } from 'lucide-react';

interface LoginLocationState {
  from?: {
    pathname?: string;
  };
}

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signInWithEmail } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const locationState = location.state as LoginLocationState | null;
  const from = locationState?.from?.pathname || '/account';

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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid email or password.';
      error('Sign-in failed', message);
    } finally {
      setIsLoading(false);
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
