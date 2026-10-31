import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Play,
  Truck,
  ShoppingBag,
  Sparkles,
  UtensilsCrossed,
  Check,
  Star,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Clock,
  Heart,
  Plus,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { HowToOrderModal } from '../components/ui/HowToOrderModal';
import { INITIAL_PRODUCTS, INITIAL_SUBSCRIPTION_PLANS, INITIAL_DELIVERY_AREAS } from '../data/initialData';
import { formatPence } from '../lib/utils';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { motion } from 'motion/react';

export const HomePage: React.FC = () => {
  const { addItem, openCart } = useCart();
  const { success } = useToast();
  const [howToOrderOpen, setHowToOrderOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'all' | 'snack' | 'juice'>('all');
  const [postcodeCheck, setPostcodeCheck] = useState('');
  const [postcodeResult, setPostcodeResult] = useState<{ eligible: boolean; area?: string } | null>(null);

  const filteredProducts = INITIAL_PRODUCTS.filter((p) => {
    if (activeCategory === 'all') return true;
    return p.type === activeCategory;
  });

  const handlePostcodeCheck = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = postcodeCheck.trim().toUpperCase();
    const outward = clean.split(' ')[0];

    const validCodes = ['NE1', 'NE2', 'NE3', 'NE4', 'NE5', 'NE6', 'NE7', 'NE8', 'NE9', 'NE10'];
    if (validCodes.some((code) => outward.startsWith(code))) {
      setPostcodeResult({ eligible: true, area: outward });
    } else {
      setPostcodeResult({ eligible: false });
    }
  };

  return (
    <div className="space-y-16 sm:space-y-24 pb-20 overflow-x-hidden">
      {/* =========================================================================
          BESPOKE HERO SECTION (Designed strictly from user reference screenshot)
          ========================================================================= */}
      <section className="relative pt-6 sm:pt-10 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Soft Organic Blush behind headline (matching reference) */}
        <div
          className="w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-[#fdece6]/70 blur-3xl absolute -top-12 -left-12 pointer-events-none -z-10"
          aria-hidden="true"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-4 items-center">
          {/* ----------------- LEFT COLUMN: Punchy Headline & Actions ----------------- */}
          <div className="lg:col-span-4 text-left space-y-6 z-10">
            {/* Main Headline with multi-color emphasis */}
            <h1 className="text-5xl sm:text-6xl lg:text-[4rem] font-medium text-stone-900 tracking-tight leading-[1.08]">
              Fastest <span className="text-[#155d2c]">Delivery</span> &amp; <br />
              Easy <span className="text-[#c9932b]">Pickup</span>
            </h1>

            {/* Avatar Social Proof Quote */}
            <div className="flex items-center gap-3 pt-1">
              <div className="relative shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
                  alt="Bloom by Pela Customer"
                  className="h-11 w-11 rounded-full object-cover border-2 border-white shadow-md"
                />
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
              </div>
              <p className="text-xs text-stone-600 font-medium leading-relaxed max-w-xs">
                When you crave wholesome artisan food &amp; cold-pressed vitality, we are just a click away in Newcastle!
              </p>
            </div>

            {/* Dual Action CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              {/* Primary Emerald Search / Browse Pill Button */}
              <Link to="/shop">
                <button
                  type="button"
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[#155d2c] hover:bg-[#104923] active:scale-95 text-white font-semibold text-sm shadow-xl shadow-emerald-900/15 transition-all duration-200 cursor-pointer"
                >
                  <Search className="h-4 w-4 text-emerald-200" />
                  <span>Browse Treats</span>
                </button>
              </Link>

              {/* Segmented Ring "How to order" Button */}
              <button
                type="button"
                onClick={() => setHowToOrderOpen(true)}
                className="inline-flex items-center gap-3 group cursor-pointer active:scale-95 transition-transform"
              >
                <div className="relative flex items-center justify-center h-12 w-12 rounded-full bg-white shadow-md border border-stone-200">
                  {/* Stylized Partial Arc Overlay matching screenshot */}
                  <svg className="absolute inset-0 h-full w-full -rotate-45" viewBox="0 0 48 48">
                    <circle
                      cx="24"
                      cy="24"
                      r="21"
                      fill="none"
                      stroke="#f3f4f6"
                      strokeWidth="3.5"
                    />
                    <circle
                      cx="24"
                      cy="24"
                      r="21"
                      fill="none"
                      stroke="#e57b32"
                      strokeWidth="3.5"
                      strokeDasharray="130"
                      strokeDashoffset="60"
                      strokeLinecap="round"
                    />
                  </svg>
                  <Play className="h-4 w-4 text-stone-900 fill-stone-900 ml-0.5 group-hover:text-[#e57b32] group-hover:fill-[#e57b32] transition-colors" />
                </div>
                <span className="text-sm font-semibold text-stone-800 group-hover:text-[#e57b32] transition-colors">
                  How to order
                </span>
              </button>
            </div>
          </div>

          {/* ----------------- CENTER COLUMN: The Visual Centerpiece ----------------- */}
          <div className="lg:col-span-5 relative flex items-center justify-center my-6 lg:my-0">
            {/* Ambient Background Glow */}
            <div className="relative w-[320px] h-[320px] sm:w-[380px] sm:h-[380px] flex items-center justify-center">
              {/* Outer Emerald Orbital Curved Arc (Top Left) */}
              <div
                className="absolute -top-4 -left-4 w-44 h-44 rounded-full border-t-4 border-l-4 border-[#155d2c] -rotate-12 pointer-events-none"
                aria-hidden="true"
              />

              {/* Outer Orange/Gold Orbital Curved Arc (Bottom Right) */}
              <div
                className="absolute -bottom-4 -right-4 w-48 h-48 rounded-full border-b-4 border-r-4 border-[#e57b32] rotate-12 pointer-events-none"
                aria-hidden="true"
              />

              {/* Concentric Dashed Ring */}
              <div
                className="absolute inset-3 rounded-full border-2 border-dashed border-[#c9932b]/40 pointer-events-none"
                aria-hidden="true"
              />

              {/* Golden Sun Disk */}
              <div className="w-[280px] h-[280px] sm:w-[340px] sm:h-[340px] rounded-full bg-gradient-to-tr from-[#f6c944] via-[#fbd760] to-[#f9cf48] shadow-2xl flex items-center justify-center overflow-hidden relative">
                {/* Bloom by Pela Hero Showcase */}
                <img
                  src="https://res.cloudinary.com/titznrnk/image/upload/f_auto,q_auto/Bloombypela"
                  alt="Bloom by Pela fresh juices and artisan snacks"
                  className="w-full h-full object-cover"
                />

                {/* Floating Fresh Badge */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/95 backdrop-blur-md shadow-lg border border-gold-200 text-[10px] font-bold text-[#155d2c] flex items-center gap-1.5 whitespace-nowrap">
                  <Sparkles className="h-3 w-3 text-[#deb252]" />
                  <span>Handcrafted Weekly</span>
                </div>
              </div>
            </div>
          </div>

          {/* ----------------- RIGHT COLUMN: 3 Stacked Feature Pills ----------------- */}
          <div className="lg:col-span-3 space-y-4 text-left">
            {/* Feature 1: Fast Thursday Delivery */}
            <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-xs border border-stone-100 shadow-md hover:shadow-lg hover:border-[#deb252]/40 transition-all flex items-start gap-3.5 group">
              <div className="h-11 w-11 rounded-full bg-stone-50 border border-stone-200/80 shadow-xs flex items-center justify-center shrink-0 text-[#155d2c] group-hover:bg-[#f0f7f2] transition-colors">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-serif text-sm font-bold text-stone-900">
                  Fast delivery
                </h4>
                <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                  Scheduled delivery to your Newcastle doorstep every Thursday. Free on £30+.
                </p>
              </div>
            </div>

            {/* Feature 2: Pick Up */}
            <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-xs border border-stone-100 shadow-md hover:shadow-lg hover:border-[#deb252]/40 transition-all flex items-start gap-3.5 group">
              <div className="h-11 w-11 rounded-full bg-stone-50 border border-stone-200/80 shadow-xs flex items-center justify-center shrink-0 text-[#e57b32] group-hover:bg-orange-50 transition-colors">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-serif text-sm font-bold text-stone-900">
                  Pick up
                </h4>
                <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                  Click &amp; collect options available in Jesmond and City Centre.
                </p>
              </div>
            </div>

            {/* Feature 3: Raw Living Vitality */}
            <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-xs border border-stone-100 shadow-md hover:shadow-lg hover:border-[#deb252]/40 transition-all flex items-start gap-3.5 group">
              <div className="h-11 w-11 rounded-full bg-stone-50 border border-stone-200/80 shadow-xs flex items-center justify-center shrink-0 text-[#155d2c] group-hover:bg-[#f0f7f2] transition-colors">
                <UtensilsCrossed className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-serif text-sm font-bold text-stone-900">
                  100% Pure &amp; Raw
                </h4>
                <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                  Cold-pressed in the UK with zero added sugar, heat pasteurisation or additives.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          POSTCODE CHECKER WIDGET
          ========================================================================= */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-stone-200/80 text-left">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#e57b32]">
                <Truck className="h-4 w-4" /> Newcastle Delivery Check
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-stone-900">
                Check Your Postcode for Thursday Drop
              </h3>
              <p className="text-xs text-stone-500">
                Enter your UK outward postcode (e.g. NE1, NE2, NE3, NE7) to check eligible areas.
              </p>
            </div>

            <form onSubmit={handlePostcodeCheck} className="flex w-full md:w-auto gap-2">
              <input
                type="text"
                placeholder="e.g. NE2 2AZ"
                value={postcodeCheck}
                onChange={(e) => setPostcodeCheck(e.target.value)}
                className="w-full md:w-44 rounded-xl border border-stone-300 px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#155d2c]"
                required
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#155d2c] text-white text-xs font-semibold hover:bg-[#104923] transition-colors shrink-0 cursor-pointer shadow-sm"
              >
                Check
              </button>
            </form>
          </div>

          {postcodeResult && (
            <div className="mt-4 pt-4 border-t border-stone-100">
              {postcodeResult.eligible ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    Postcode outward <strong>{postcodeResult.area}</strong> is eligible for Thursday fresh delivery (Free on orders £30+)!
                  </span>
                </div>
              ) : (
                <div className="text-xs text-stone-700 bg-stone-100 p-3 rounded-xl border border-stone-200">
                  <span>
                    Juices are delivered fresh across Newcastle &amp; Gateshead (NE1–NE10). Snacks can also be shipped or collected in Jesmond.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* =========================================================================
          CATALOGUE DISCOVERY TABS & PRODUCT CARDS
          ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200/80 pb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#deb252]">
              Handcrafted Menu
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mt-1">
              Fresh Weekly Drops
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Life in Every Bite (Nigerian snacks) • Life in Every Sip (Cold-pressed juices)
            </p>
          </div>

          {/* Interactive Filter Pills */}
          <div className="flex items-center gap-2 bg-stone-100 p-1.5 rounded-xl border border-stone-200 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              All Items
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('snack')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeCategory === 'snack'
                  ? 'bg-[#c9932b] text-white shadow-xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Snacks
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('juice')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeCategory === 'juice'
                  ? 'bg-[#155d2c] text-white shadow-xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Fresh juices and drinks
            </button>
          </div>
        </div>

        {/* Product Cards Grid: 2 Columns on Mobile, 2 on Tablet, 3 on Desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 lg:gap-8">
          {filteredProducts.map((product) => {
            const defaultVariant = product.variants[0];

            return (
              <div
                key={product.id}
                className="group bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-stone-200/80 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <Link
                    to={`/product/${product.slug}`}
                    className="block relative aspect-4/3 overflow-hidden bg-stone-100 cursor-pointer"
                    title={`View ${product.name} details`}
                  >
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-wrap gap-1">
                      <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-white/95 backdrop-blur-xs text-[#155d2c] shadow-2xs border border-stone-200">
                        {product.weightOrVolume}
                      </span>
                    </div>
                  </Link>

                  <div className="p-3 sm:p-6">
                    <Link to={`/product/${product.slug}`} className="block">
                      <h3 className="font-serif text-xs sm:text-lg font-bold text-stone-900 line-clamp-1 group-hover:text-[#155d2c] transition-colors">
                        {product.name}
                      </h3>
                    </Link>
                    <p className="text-[10px] sm:text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                      {product.shortDescription || product.description}
                    </p>

                    <div className="mt-2.5 sm:mt-4 flex flex-wrap gap-1">
                      {product.ingredients.slice(0, 2).map((ing, i) => (
                        <span
                          key={i}
                          className="text-[9px] sm:text-[10px] bg-stone-50 border border-stone-200 text-stone-600 px-1.5 py-0.5 rounded"
                        >
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-3 sm:p-6 pt-0 border-t border-stone-100 mt-2 flex items-center justify-between gap-1">
                  <div className="min-w-0">
                    <span className="text-[8px] sm:text-[10px] uppercase text-stone-400 font-bold block truncate">
                      {defaultVariant.name}
                    </span>
                    <span className="font-serif text-sm sm:text-xl font-bold text-[#155d2c]">
                      {formatPence(defaultVariant.pricePence)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      addItem(product, defaultVariant, 1);
                      openCart();
                      success('Added to basket', `${product.name} added.`);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-[#155d2c] hover:bg-[#104923] active:scale-95 text-white text-[11px] sm:text-xs font-semibold shadow-xs transition-all cursor-pointer shrink-0"
                  >
                    <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          WEEKLY SUBSCRIPTION BANNER (Designed with Emerald & Warm Gold)
          ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-[#0a3318] via-[#155d2c] to-[#0a3318] text-white p-8 sm:p-12 relative overflow-hidden shadow-2xl border border-[#deb252]/40 text-left">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
          <div className="max-w-2xl space-y-4">
            <span className="inline-block px-3 py-1 rounded-full bg-[#deb252] text-[11px] font-bold uppercase tracking-wider text-[#0a3318]">
              Weekly Juice Subscription
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Newcastle's Fresh Weekly Juice Ritual
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed font-light">
              Never run out of morning nutrients. Pick your pack (Bloom 3 or Bloom 5), customize your flavours each week, and receive your cold-pressed wellness package every Thursday morning.
            </p>

            <div className="pt-2 flex flex-wrap gap-4 items-center">
              <Link to="/subscriptions">
                <Button variant="gold" size="lg" className="text-stone-900 font-bold" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  Choose Your Plan (From £12.50/wk)
                </Button>
              </Link>
              <div className="flex items-center gap-2 text-xs text-stone-200">
                <ShieldCheck className="h-4 w-4 text-[#deb252]" />
                <span>Pause, skip or cancel anytime in 2 clicks</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How To Order Modal */}
      <HowToOrderModal
        isOpen={howToOrderOpen}
        onClose={() => setHowToOrderOpen(false)}
      />
    </div>
  );
};
