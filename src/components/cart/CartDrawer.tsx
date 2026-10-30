import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ShoppingBag,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Trash2,
  ArrowLeft,
  ChevronDown,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { formatPence } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Link } from 'react-router-dom';

export const CartDrawer: React.FC = () => {
  const {
    isOpen,
    closeCart,
    items,
    updateQuantity,
    removeItem,
    clearCart,
    totalItems,
    subtotalPence,
    hasJuices,
    hasSnacks,
  } = useCart();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const FREE_DELIVERY_THRESHOLD = 3000; // £30.00
  const progressToFree = Math.min(100, Math.round((subtotalPence / FREE_DELIVERY_THRESHOLD) * 100));
  const amountToFree = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotalPence);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeCart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeCart]);

  // Lock body scroll when cart is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-label="Shopping Cart">
          {/* Backdrop with touch dismiss */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity cursor-pointer"
          />

          {/* Drawer container: full width on mobile, max-w-md on tablet/desktop */}
          <div className="fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-8 pointer-events-none">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="pointer-events-auto w-screen max-w-full sm:max-w-md bg-[#FDFBF7] shadow-2xl flex flex-col h-[100dvh] max-h-[100dvh] border-l border-[#eedcc8]"
            >
              {/* Mobile grab handle for tactile native feel */}
              <div className="sm:hidden w-full flex justify-center pt-2 pb-0.5 bg-[#FFF5E6]">
                <div className="w-12 h-1.5 rounded-full bg-stone-300" />
              </div>

              {/* =========================================================
                  PROMINENT HEADER WITH HIGH-VISIBILITY EXIT BUTTON
                  ========================================================= */}
              <div className="flex items-center justify-between border-b border-[#eedcc8] px-4 sm:px-6 py-3.5 bg-[#FFF5E6] shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#155d2c]/10 border border-[#155d2c]/20 flex items-center justify-center text-[#155d2c] shrink-0">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-serif text-lg font-bold text-stone-900 leading-tight">
                      Your Basket
                    </h2>
                    <p className="text-xs text-stone-600 font-medium">
                      {totalItems} {totalItems === 1 ? 'item' : 'items'}
                      {totalItems > 0 && ` • ${formatPence(subtotalPence)}`}
                    </p>
                  </div>
                </div>

                {/* Highly Prominent Exit Button */}
                <div className="flex items-center gap-2">
                  {totalItems > 0 && (
                    <button
                      type="button"
                      onClick={clearCart}
                      className="hidden sm:inline-block text-[11px] text-stone-500 hover:text-red-600 font-medium px-2 py-1 transition-colors"
                      title="Empty all items from basket"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={closeCart}
                    className="group flex items-center gap-1.5 px-3 py-2 rounded-full bg-stone-100 hover:bg-[#155d2c] text-stone-800 hover:text-white border-2 border-stone-300 hover:border-[#155d2c] shadow-xs active:scale-95 transition-all duration-200 cursor-pointer min-h-[44px] min-w-[44px] justify-center"
                    aria-label="Close basket"
                    title="Close basket (Esc)"
                  >
                    <span className="text-xs font-bold uppercase tracking-wider hidden xs:inline">Close</span>
                    <X className="h-5 w-5 stroke-[2.5] transition-transform duration-200 group-hover:rotate-90" />
                  </button>
                </div>
              </div>

              {/* Free delivery progress bar */}
              <div className="bg-[#faf2dc] px-4 sm:px-6 py-2.5 border-b border-[#f5e3b5] text-xs shrink-0">
                {amountToFree > 0 ? (
                  <p className="text-[#8b5b1a] text-center sm:text-left">
                    Add <strong className="font-bold text-[#71481b]">{formatPence(amountToFree)}</strong> more for{' '}
                    <span className="font-semibold underline decoration-[#deb252]">Free Newcastle Delivery</span>!
                  </p>
                ) : (
                  <p className="text-[#155d2c] font-bold flex items-center justify-center sm:justify-start gap-1.5">
                    <Sparkles className="h-4 w-4 text-[#c9932b]" /> You've unlocked Free Newcastle Delivery!
                  </p>
                )}
                <div className="mt-1.5 h-2 w-full bg-stone-200/90 rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-[#deb252] to-[#c9932b] transition-all duration-300 rounded-full"
                    style={{ width: `${progressToFree}%` }}
                  />
                </div>
              </div>

              {/* Items scroll indicator hint if 3+ items */}
              {items.length >= 3 && (
                <div className="bg-stone-100/90 border-b border-stone-200/80 px-4 py-1 text-[11px] text-stone-600 flex items-center justify-between shrink-0">
                  <span className="font-medium">Scroll down to view all {items.length} items</span>
                  <ChevronDown className="h-3.5 w-3.5 text-stone-500 animate-bounce" />
                </div>
              )}

              {/* =========================================================
                  DEDICATED SCROLLER AREA (Mobile-optimized with custom thumb)
                  ========================================================= */}
              <div
                ref={scrollContainerRef}
                className="cart-scroller flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y px-4 sm:px-6 py-3 divide-y divide-stone-200/80 relative"
              >
                {items.length === 0 ? (
                  <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 text-stone-500">
                    <div className="h-20 w-20 rounded-full bg-[#FFF5E6] border border-[#eedcc8] flex items-center justify-center mb-4 text-[#155d2c] shadow-xs">
                      <ShoppingBag className="h-10 w-10 text-[#155d2c]" />
                    </div>
                    <p className="font-serif text-xl font-bold text-stone-900">Your basket is empty</p>
                    <p className="text-xs text-stone-600 mt-1.5 max-w-xs leading-relaxed">
                      Explore our handcrafted Nigerian-sourced artisan snacks and freshly cold-pressed bespoke juices.
                    </p>
                    <div className="mt-6 flex flex-col w-full max-w-xs gap-2.5">
                      <Link to="/shop" onClick={closeCart} className="w-full">
                        <Button size="md" variant="primary" className="w-full shadow-md">
                          Explore All Shop
                        </Button>
                      </Link>
                      <div className="grid grid-cols-2 gap-2">
                        <Link to="/shop/snacks" onClick={closeCart}>
                          <Button size="sm" variant="outline" className="w-full text-xs">
                            Snacks
                          </Button>
                        </Link>
                        <Link to="/shop/juices" onClick={closeCart}>
                          <Button size="sm" variant="outline" className="w-full text-xs">
                            Juices
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  items.map((item) => (
                    <div
                      key={item.id}
                      className="py-3.5 first:pt-1 last:pb-2 flex gap-3.5 items-center group transition-colors"
                    >
                      {/* Product Thumbnail */}
                      <div className="relative shrink-0">
                        <img
                          src={item.product.images[0] || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=200&q=80'}
                          alt={item.product.name}
                          className="h-20 w-20 sm:h-22 sm:w-22 object-cover rounded-xl border border-stone-200/90 bg-stone-100 shadow-2xs"
                        />
                        <span
                          className={`absolute -top-1.5 -left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs ${
                            item.product.type === 'juice'
                              ? 'bg-[#155d2c] text-white'
                              : 'bg-[#deb252] text-stone-950'
                          }`}
                        >
                          {item.product.type === 'juice' ? 'Juice' : 'Snack'}
                        </span>
                      </div>

                      {/* Product Details & Controls */}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-sm font-bold text-stone-900 truncate">
                            {item.product.name}
                          </h4>
                          <span className="text-sm font-bold text-[#742937] shrink-0">
                            {formatPence(item.variant.pricePence * item.quantity)}
                          </span>
                        </div>

                        <p className="text-xs text-stone-500 mt-0.5">
                          {item.variant.name} • <span className="font-medium text-stone-700">{formatPence(item.variant.pricePence)} each</span>
                        </p>

                        {/* Touch-Friendly Stepper & Delete Button */}
                        <div className="mt-3 flex items-center justify-between gap-2">
                          {/* Tactile Quantity Stepper with >= 36px touch target */}
                          <div className="flex items-center bg-white border border-stone-300 rounded-lg shadow-2xs overflow-hidden">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="h-8 w-8 sm:h-8 sm:w-8 flex items-center justify-center text-stone-600 hover:text-stone-950 hover:bg-stone-100 active:bg-stone-200 transition-colors cursor-pointer"
                              aria-label={`Decrease ${item.product.name} quantity`}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-8 text-center text-xs font-bold text-stone-900 select-none">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="h-8 w-8 sm:h-8 sm:w-8 flex items-center justify-center text-stone-600 hover:text-stone-950 hover:bg-stone-100 active:bg-stone-200 transition-colors cursor-pointer"
                              aria-label={`Increase ${item.product.name} quantity`}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Quick Remove Button with Trash Icon */}
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-stone-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            aria-label={`Remove ${item.product.name} from basket`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="hidden xs:inline text-[11px] font-medium">Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* =========================================================
                  FIXED FOOTER: SUB-TOTAL, CHECKOUT & DISMISS
                  ========================================================= */}
              {items.length > 0 && (
                <div className="border-t border-stone-200 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-4 space-y-3.5 shrink-0 shadow-[0_-8px_25px_rgba(0,0,0,0.06)] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                  {/* Mixed cart indicator notice */}
                  {hasJuices && hasSnacks && (
                    <div className="bg-emerald-50/80 text-[#155d2c] text-xs p-2.5 rounded-xl border border-emerald-200/80 flex items-start gap-2">
                      <ShieldCheck className="h-4 w-4 text-[#155d2c] shrink-0 mt-0.5" />
                      <span className="leading-tight">
                        Combined order: Fresh juices are freshly pressed and delivered on set weekly schedule.
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-stone-500 font-semibold block">Subtotal</span>
                      <span className="text-[11px] text-stone-400">Excl. Newcastle delivery</span>
                    </div>
                    <span className="font-serif text-2xl font-bold text-stone-900">
                      {formatPence(subtotalPence)}
                    </span>
                  </div>

                  {/* Checkout CTA */}
                  <div className="space-y-2">
                    <Link to="/checkout" onClick={closeCart} className="block w-full">
                      <Button
                        variant="primary"
                        size="lg"
                        className="w-full shadow-lg h-12 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                        rightIcon={<ArrowRight className="h-4 w-4" />}
                      >
                        Proceed to Checkout
                      </Button>
                    </Link>

                    {/* Prominent Dismiss / Continue Shopping Button */}
                    <button
                      type="button"
                      onClick={closeCart}
                      className="w-full py-2.5 flex items-center justify-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Continue Shopping</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

