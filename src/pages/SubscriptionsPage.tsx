import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';

import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { EmptyState } from '../components/ui/EmptyState';

export const SubscriptionsPage: React.FC = () => {
  return (
    <ErrorBoundary
      fallback={
        <EmptyState
          title="Something went wrong"
          description="The subscription page encountered an error. Please refresh the page."
        />
      }
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16 text-left">
        {/* Hero Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="inline-block px-3 py-1 rounded-full bg-[#faf1de] text-[#8d561c] text-xs font-bold uppercase tracking-wider border border-[#f4e1ba]">
            Weekly Juice Subscriptions
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-stone-900 leading-tight">
            Your Weekly Wellness Ritual, <br />
            <span className="italic text-[#7e2b44]">Bottled Fresh Every Thursday.</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-light">
            Recurring weekly deliveries of raw, cold-pressed juices tailored to your taste, delivered
            to your Newcastle doorstep every Thursday.
          </p>
        </div>

        {/* Plans are paused until the owner confirms the new pricing. No prices are
            rendered here so customers are never shown an out-of-date amount. */}
        <div className="max-w-3xl mx-auto rounded-3xl border-2 border-[#deb252]/60 bg-white p-8 sm:p-10 shadow-xl text-center space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#faf1de] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#8d561c] border border-[#f4e1ba]">
            <Sparkles className="h-3.5 w-3.5" /> Coming soon
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
            New weekly plans are being finalised
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-xl mx-auto">
            We are repricing our 3-bottle and 5-bottle weekly plans around the new menu. No
            subscription price is shown — or charged — until the new plan costs are confirmed.
          </p>
          <p className="text-xs text-stone-500 leading-relaxed">
            Questions about an existing plan?{' '}
            <Link
              to="/contact"
              className="font-semibold text-[#7e2b44] underline underline-offset-2 hover:text-[#5a1f2e]"
            >
              Contact us
            </Link>{' '}
            and we will help.
          </p>
        </div>

        {/* Subscription Rules & Guarantee */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="p-6 rounded-2xl bg-cream-100/60 border border-stone-200">
            <Calendar className="h-6 w-6 text-[#7e2b44] mb-3" />
            <h4 className="font-serif text-base font-bold text-stone-900">Monday 12:00 Cut-off</h4>
            <p className="text-xs text-stone-600 mt-1 leading-relaxed">
              All flavour adjustments, skips, or pauses must be confirmed by Monday noon for that
              week's Thursday drop.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-cream-100/60 border border-stone-200">
            <RotateCcw className="h-6 w-6 text-[#cb932b] mb-3" />
            <h4 className="font-serif text-base font-bold text-stone-900">Pause for 1–8 Weeks</h4>
            <p className="text-xs text-stone-600 mt-1 leading-relaxed">
              Going on holiday? Pause your subscription for up to 8 weeks with automatic resumption.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-cream-100/60 border border-stone-200">
            <ShieldCheck className="h-6 w-6 text-[#245840] mb-3" />
            <h4 className="font-serif text-base font-bold text-stone-900">No Commitments</h4>
            <p className="text-xs text-stone-600 mt-1 leading-relaxed">
              Cancel anytime in 2 clicks right inside your account dashboard or update cards via
              Stripe Customer Portal.
            </p>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};
