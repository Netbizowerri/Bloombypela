import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Lock, Mail, User, ShieldCheck } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { signUpWithEmail } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      error('Missing details', 'Please fill in all required fields.');
      return;
    }
    if (!acceptTerms) {
      error('Terms required', 'Please accept the Terms of Service & Privacy Policy.');
      return;
    }

    setIsLoading(true);
    try {
      await signUpWithEmail(email, password, name);
      success('Account created!', 'Welcome to Bloom by Pela.');
      navigate('/account');
    } catch (err: any) {
      error('Registration failed', err?.message || 'Could not complete registration.');
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
            Create your account
          </h2>
          <p className="mt-1 text-xs text-stone-500">
            Join Bloom by Pela for bespoke juice subscriptions and artisan snacks
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-xl border border-stone-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              placeholder="e.g. Sarah Jenkins"
              value={name}
              onChange={(e) => setName(e.target.value)}
              leftElement={<User className="h-4 w-4" />}
              required
            />

            <Input
              label="Email Address"
              type="email"
              autoComplete="email"
              placeholder="sarah@example.co.uk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftElement={<Mail className="h-4 w-4" />}
              required
            />

            <Input
              label="Password (min 8 characters)"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftElement={<Lock className="h-4 w-4" />}
              required
            />

            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-2.5 text-xs text-stone-600 cursor-pointer text-left">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 rounded border-stone-300 text-[#7e2b44] focus:ring-[#7e2b44]"
                  required
                />
                <span>
                  I agree to the{' '}
                  <Link to="/terms" className="underline text-[#7e2b44]">
                    Terms of Service
                  </Link>{' '}
                  and acknowledge the{' '}
                  <Link to="/privacy" className="underline text-[#7e2b44]">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-stone-600 cursor-pointer text-left">
                <input
                  type="checkbox"
                  checked={marketingConsent}
                  onChange={(e) => setMarketingConsent(e.target.checked)}
                  className="mt-0.5 rounded border-stone-300 text-[#7e2b44] focus:ring-[#7e2b44]"
                />
                <span>
                  Send me seasonal juice updates, flavour drops, and special offers (optional).
                </span>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-4"
              isLoading={isLoading}
              rightIcon={<ShieldCheck className="h-4 w-4" />}
            >
              Create Account
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-stone-600">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-[#7e2b44] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
