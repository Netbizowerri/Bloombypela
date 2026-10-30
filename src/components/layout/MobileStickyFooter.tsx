import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  ShoppingBag,
  Grid,
  User,
  X,
  ArrowRight,
  Sparkles,
  UtensilsCrossed,
  RotateCcw,
  Package,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';

export const MobileStickyFooter: React.FC = () => {
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const { totalItems } = useCart();
  const { user } = useAuth();
  const location = useLocation();

  const categories = [
    {
      title: 'Packaged Snacks',
      subtitle: 'Life in Every Bite • Nigerian sourced',
      to: '/shop/snacks',
      icon: Package,
      color: 'bg-amber-100 text-amber-900 border-amber-200',
      badge: 'Artisan',
    },
    {
      title: 'Cold-Pressed Juices',
      subtitle: 'Life in Every Sip • UK Prepared',
      to: '/shop/juices',
      icon: UtensilsCrossed,
      color: 'bg-emerald-100 text-[#155d2c] border-emerald-200',
      badge: 'Raw & Fresh',
    },
    {
      title: 'Weekly Subscriptions',
      subtitle: 'From £12.50/wk • Thursday deliveries',
      to: '/subscriptions',
      icon: RotateCcw,
      color: 'bg-[#faf2dc] text-[#8b5b1a] border-[#f5e3b5]',
      badge: 'Save £3.00',
    },
    {
      title: 'Delivery Coverage',
      subtitle: 'Newcastle postcodes NE1–NE10 schedule',
      to: '/delivery',
      icon: Sparkles,
      color: 'bg-stone-100 text-stone-800 border-stone-200',
      badge: 'Free on £30+',
    },
  ];

  return (
    <>
      {/* =====================================================================
          STICKY BOTTOM NAVIGATION (Mobile only, fixed bottom, high craft)
          ===================================================================== */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-[#FFF5E6]/95 backdrop-blur-xl border-t border-[#eedcc8] shadow-[0_-6px_25px_rgba(0,0,0,0.08)] px-3 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))]"
      >
        <div className="grid grid-cols-4 items-center gap-1 max-w-md mx-auto">
          {/* 1. HOME */}
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all duration-200 active:scale-90 select-none group ${
                isActive
                  ? 'text-[#155d2c] font-bold'
                  : 'text-stone-500 hover:text-[#155d2c]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`p-1.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-[#155d2c]/10 text-[#155d2c] shadow-xs'
                      : 'bg-transparent group-hover:bg-[#155d2c]/5 group-hover:text-[#155d2c]'
                  }`}
                >
                  <Home className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
                </div>
                <span className="text-[11px] mt-0.5 tracking-tight font-medium">Home</span>
              </>
            )}
          </NavLink>

          {/* 2. SHOP */}
          <NavLink
            to="/shop"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all duration-200 active:scale-90 select-none relative group ${
                isActive || location.pathname.startsWith('/shop')
                  ? 'text-[#155d2c] font-bold'
                  : 'text-stone-500 hover:text-[#155d2c]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`p-1.5 rounded-xl transition-all duration-200 relative ${
                    isActive || location.pathname.startsWith('/shop')
                      ? 'bg-[#155d2c]/10 text-[#155d2c] shadow-xs'
                      : 'bg-transparent group-hover:bg-[#155d2c]/5 group-hover:text-[#155d2c]'
                  }`}
                >
                  <ShoppingBag className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
                  {totalItems > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-[#deb252] text-stone-900 text-[9px] font-bold shadow-xs">
                      {totalItems}
                    </span>
                  )}
                </div>
                <span className="text-[11px] mt-0.5 tracking-tight font-medium">Shop</span>
              </>
            )}
          </NavLink>

          {/* 3. CATEGORIES (Interactive Bottom Sheet Trigger) */}
          <button
            type="button"
            onClick={() => setCategoriesOpen(true)}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all duration-200 active:scale-90 select-none cursor-pointer group ${
              categoriesOpen
                ? 'text-[#155d2c] font-bold'
                : 'text-stone-500 hover:text-[#155d2c]'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all duration-200 ${
                categoriesOpen
                  ? 'bg-[#155d2c]/10 text-[#155d2c] shadow-xs'
                  : 'bg-transparent group-hover:bg-[#155d2c]/5 group-hover:text-[#155d2c]'
              }`}
            >
              <Grid className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
            </div>
            <span className="text-[11px] mt-0.5 tracking-tight font-medium">Categories</span>
          </button>

          {/* 4. ACCOUNT */}
          <NavLink
            to={user ? '/account' : '/login'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all duration-200 active:scale-90 select-none group ${
                isActive
                  ? 'text-[#155d2c] font-bold'
                  : 'text-stone-500 hover:text-[#155d2c]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`p-1.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-[#155d2c]/10 text-[#155d2c] shadow-xs'
                      : 'bg-transparent group-hover:bg-[#155d2c]/5 group-hover:text-[#155d2c]'
                  }`}
                >
                  <User className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
                </div>
                <span className="text-[11px] mt-0.5 tracking-tight font-medium">
                  {user ? 'Account' : 'Account'}
                </span>
              </>
            )}
          </NavLink>
        </div>
      </nav>

      {/* =====================================================================
          CATEGORIES BOTTOM SHEET (Mobile Slide-up)
          ===================================================================== */}
      <AnimatePresence>
        {categoriesOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCategoriesOpen(false)}
              className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs transition-opacity"
            />

            {/* Slide-up Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full bg-[#FFF5E6] rounded-t-3xl shadow-2xl border-t border-[#eedcc8] p-6 pb-8 space-y-4 z-10 text-left"
            >
              {/* Handle bar */}
              <div className="w-12 h-1.5 rounded-full bg-stone-300 mx-auto -mt-1 mb-2" />

              <div className="flex items-center justify-between border-b border-[#eedcc8] pb-3">
                <div>
                  <h3 className="font-serif text-lg font-bold text-stone-900">
                    Explore Categories
                  </h3>
                  <p className="text-xs text-stone-500">
                    Bloom by Pela • Nourish. Naturally.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCategoriesOpen(false)}
                  className="p-1.5 rounded-full bg-stone-200/60 text-stone-600 hover:bg-stone-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Category Cards */}
              <div className="space-y-2.5">
                {categories.map((cat, i) => (
                  <Link
                    key={i}
                    to={cat.to}
                    onClick={() => setCategoriesOpen(false)}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-[#eedcc8]/80 hover:border-[#155d2c] shadow-xs hover:shadow-md transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${cat.color}`}
                      >
                        <cat.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-serif text-sm font-bold text-stone-900">
                            {cat.title}
                          </h4>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                            {cat.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5">{cat.subtitle}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-stone-400 shrink-0" />
                  </Link>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
