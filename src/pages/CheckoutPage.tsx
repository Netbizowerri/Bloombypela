import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowLeft, CreditCard } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatPence } from '../lib/utils';
import { Button } from '../components/ui/Button';

/**
 * PLACEHOLDER: Checkout is not implemented yet.
 * This route exists so cart and subscription calls to action no longer 404.
 * Real checkout will be created by a Stripe Checkout Cloud Function.
 */
export const CheckoutPage: React.FC = () => {
  const { items, subtotalPence, totalItems } = useCart();

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-white p-8 rounded-2xl shadow-xl border border-stone-200">
        <div className="h-14 w-14 rounded-full bg-[#faf1de] text-[#8d561c] flex items-center justify-center mb-4 mx-auto">
          <CreditCard className="h-7 w-7" aria-hidden="true" />
        </div>

        <h1 className="font-serif text-2xl font-bold text-stone-900 text-center">
          Checkout
        </h1>

        <p className="mt-3 text-xs text-stone-600 leading-relaxed text-center">
          <span className="font-semibold uppercase tracking-wide text-[#8d561c]">
            PLACEHOLDER
          </span>{' '}
          &mdash; secure Stripe checkout is not connected yet. Your basket is saved and will be
          carried over once payments are live.
        </p>

        {items.length > 0 ? (
          <div className="mt-6 rounded-xl border border-stone-200 bg-[#fdfbf7] p-4 text-xs text-stone-700">
            <div className="flex items-center justify-between font-semibold">
              <span>
                {totalItems} {totalItems === 1 ? 'item' : 'items'} in basket
              </span>
              <span>{formatPence(subtotalPence)}</span>
            </div>
            <p className="mt-1 text-[11px] text-stone-500">
              Delivery is calculated at the next step.
            </p>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-stone-200 bg-[#fdfbf7] p-4 text-center text-xs text-stone-600">
            <ShoppingBag className="h-5 w-5 mx-auto mb-2 text-stone-400" aria-hidden="true" />
            Your basket is empty.
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <Link to="/shop">
            <Button
              variant="primary"
              size="md"
              className="w-full"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Continue shopping
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
