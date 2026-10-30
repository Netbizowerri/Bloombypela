import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { resetPassword } = useAuth();
  const { success, error } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      error('Please enter your email', 'We need your registered email address.');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(email);
      setIsSubmitted(true);
      success('Instructions sent', 'Check your inbox for password reset instructions.');
    } catch (err: any) {
      error('Error', err?.message || 'Could not send reset email.');
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
            Reset your password
          </h2>
          <p className="mt-1.5 text-xs text-stone-500">
            Enter your email and we'll send you a link to reset your account password
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-xl border border-stone-200">
          {isSubmitted ? (
            <div className="text-center py-4 space-y-4">
              <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-stone-900">
                Check your email
              </h3>
              <p className="text-xs text-stone-600 max-w-xs mx-auto leading-relaxed">
                If an account exists for <strong className="text-stone-900">{email}</strong>, you will receive password reset instructions shortly.
              </p>
              <div className="pt-4">
                <Link to="/login">
                  <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                    Back to Sign In
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Registered email address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftElement={<Mail className="h-4 w-4" />}
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-2"
                isLoading={isLoading}
              >
                Send Reset Link
              </Button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-900"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Return to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
