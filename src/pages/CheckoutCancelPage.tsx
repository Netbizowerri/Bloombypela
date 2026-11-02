/**
 * /checkout/cancel
 *
 * Stripe sends the customer here when they abandon Checkout. Nothing has been
 * charged and the basket is kept, so they can try again.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, XCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useCart } from '../context/CartContext';

export const CheckoutCancelPage: React.FC = () => {
  const { totalItems } = useCart();

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-white p-8 rounded-2xl shadow-xl border border-stone-200 text-center">
        <div className="h-14 w-14 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center mx-auto">
          <XCircle className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-stone-900 mt-4">
          Payment cancelled
        </h1>
        <p className="mt-3 text-sm text-stone-600">
          You have not been charged. Your basket has been saved
          {totalItems > 0 ? ` (${totalItems} item${totalItems === 1 ? '' : 's'})` : ''}, so you can
          pick up where you left off whenever you are ready.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Link to="/checkout">
            <Button variant="primary" size="md" className="w-full" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Return to checkout
            </Button>
          </Link>
          <Link to="/shop">
            <Button variant="outline" size="md" className="w-full" leftIcon={<ShoppingBag className="h-4 w-4" />}>
              Continue shopping
            </Button>
          </Link>
        </div>

        <p className="mt-6 text-[10px] text-stone-500">
          Held stock or delivery capacity from an abandoned checkout is released automatically
          after 15 minutes.
        </p>
      </div>
    </div>
  );
};
