import React, { useState } from 'react';
import { INITIAL_SUBSCRIPTION_PLANS, INITIAL_PRODUCTS } from '../data/initialData';
import { formatPence } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Check, Calendar, RotateCcw, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const SubscriptionsPage: React.FC = () => {
  const { user } = useAuth();
  const { success, info } = useToast();
  const navigate = useNavigate();

  const juices = INITIAL_PRODUCTS.filter((p) => p.type === 'juice');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('sub-weekly-bloom-5');
  const [selectedFlavours, setSelectedFlavours] = useState<string[]>([
    'Tropical Bloom',
    'Tropical Bloom',
    'Skin Glow/Skin Flow — final product name to be confirmed',
    'Zobo',
    'Detox juice blend',
  ]);

  const activePlan =
    INITIAL_SUBSCRIPTION_PLANS.find((p) => p.id === selectedPlanId) ||
    INITIAL_SUBSCRIPTION_PLANS[0];

  const handleFlavourToggle = (juiceName: string) => {
    if (selectedFlavours.length < activePlan.bottleCount) {
      setSelectedFlavours([...selectedFlavours, juiceName]);
    } else {
      setSelectedFlavours([...selectedFlavours.slice(1), juiceName]);
    }
  };

  const handleStartSubscription = (planId: string) => {
    if (!user) {
      info('Sign in required', 'Please sign in or create an account to start a recurring weekly subscription.');
      navigate('/login');
      return;
    }
    success('Subscription Configured', `Selected ${activePlan.name}. Ready for checkout.`);
    navigate('/checkout');
  };

  return (
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
          Enjoy recurring weekly deliveries of raw, cold-pressed juices tailored to your taste. Charged Monday at 12:00 PM London time for guaranteed delivery to your Newcastle doorstep every Thursday.
        </p>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {INITIAL_SUBSCRIPTION_PLANS.map((plan) => {
          const isSelected = plan.id === selectedPlanId;

          return (
            <div
              key={plan.id}
              onClick={() => setSelectedPlanId(plan.id)}
              className={`relative rounded-3xl p-8 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'border-[#155d2c] bg-white shadow-xl ring-2 ring-[#deb252]/50'
                  : 'border-stone-200 bg-white/70 hover:border-stone-300'
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 right-6">
                  <Badge variant="gold" size="md">
                    Most Popular
                  </Badge>
                </div>
              )}

              <div>
                <h3 className="font-serif text-2xl font-bold text-stone-900">{plan.name}</h3>
                <p className="text-xs text-stone-500 mt-1">{plan.description}</p>

                <div className="mt-6 flex items-baseline gap-2">
                  <span className="font-serif text-4xl font-bold text-[#155d2c]">
                    {formatPence(plan.pricePence)}
                  </span>
                  <span className="text-xs text-stone-500 font-medium">/ week (Billed weekly)</span>
                </div>

                <ul className="mt-6 space-y-3 text-xs text-stone-700">
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-stone-100">
                <Button
                  variant={isSelected ? 'primary' : 'outline'}
                  size="md"
                  className="w-full"
                  onClick={() => handleStartSubscription(plan.id)}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  {isSelected ? 'Subscribe with This Plan' : 'Select Plan'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Flavour Selector Preview */}
      <div className="max-w-4xl mx-auto bg-white rounded-3xl p-8 border border-stone-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-4">
          <div>
            <h3 className="font-serif text-xl font-bold text-stone-900">
              Customise Your Flavour Selection
            </h3>
            <p className="text-xs text-stone-500">
              Pick {activePlan.bottleCount} bottles for your upcoming Thursday delivery:
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#fbf4f5] text-[#7e2b44] border border-[#ecccd3]">
            {selectedFlavours.length} / {activePlan.bottleCount} Bottles Selected
          </span>
        </div>

        {/* Selected Bottles Bar */}
        <div className="flex flex-wrap gap-2">
          {selectedFlavours.map((flavour, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#faf1de] border border-[#f4e1ba] text-xs font-semibold text-[#8d561c]"
            >
              <span>{flavour}</span>
              <button
                type="button"
                onClick={() =>
                  setSelectedFlavours((prev) => prev.filter((_, i) => i !== idx))
                }
                className="hover:text-red-700 ml-1"
              >
                ×
              </button>
            </span>
          ))}
        </div>

        {/* Flavour Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {juices.map((j) => (
            <button
              key={j.id}
              type="button"
              onClick={() => handleFlavourToggle(j.name)}
              className="p-3 text-left rounded-xl border border-stone-200 hover:border-[#7e2b44] bg-stone-50/50 hover:bg-white transition-all space-y-1"
            >
              <h4 className="text-xs font-bold text-stone-900 truncate">{j.name}</h4>
              <p className="text-[10px] text-stone-500 line-clamp-1">{j.shortDescription}</p>
              <span className="text-[10px] font-semibold text-[#245840] block">+ Add bottle</span>
            </button>
          ))}
        </div>
      </div>

      {/* Subscription Rules & Guarantee Accordion */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        <div className="p-6 rounded-2xl bg-cream-100/60 border border-stone-200">
          <Calendar className="h-6 w-6 text-[#7e2b44] mb-3" />
          <h4 className="font-serif text-base font-bold text-stone-900">Monday 12:00 Cut-off</h4>
          <p className="text-xs text-stone-600 mt-1 leading-relaxed">
            All flavour adjustments, skips, or pauses must be confirmed by Monday noon for that week's Thursday drop.
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
            Cancel anytime in 2 clicks right inside your account dashboard or update cards via Stripe Customer Portal.
          </p>
        </div>
      </div>
    </div>
  );
};
