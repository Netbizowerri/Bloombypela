/**
 * /checkout/success
 *
 * Reads the Stripe Checkout Session id from the query string and asks the
 * `getOrderBySession` callable what the server knows. It never confirms an
 * order itself: the order only exists once the signature-verified Stripe
 * webhook has written it. The cart is cleared only after the server returns a
 * confirmed order.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { EmptyState } from '../components/ui/EmptyState';
import { useCart } from '../context/CartContext';
import { checkoutApi, type OrderBySessionResult, type PublicOrder } from '../lib/checkout';
import { formatLondonDate, formatPence } from '../lib/utils';

const QUICK_POLL_MS = 2500;
const SLOW_POLL_MS = 5000;
const QUICK_ATTEMPTS = 24; // first minute: 2.5s interval
const MAX_ATTEMPTS = 72; // ~5 minutes total, then offer a manual refresh

type Phase = 'loading' | 'pending' | 'confirmed' | 'unfulfilled' | 'not_found' | 'error';

function OrderSummary({ order }: { order: PublicOrder }) {
  return (
    <div className="mt-6 rounded-xl border border-stone-200 overflow-hidden">
      <div className="bg-[#f7f5f0] px-4 py-3 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider font-semibold text-stone-500">
          Order
        </span>
        <span className="font-mono text-sm font-bold text-stone-900">{order.orderNumber}</span>
      </div>
      <div className="p-4 space-y-3 bg-white">
        {order.items.map((item, index) => (
          <div key={`${item.name}-${index}`} className="flex justify-between text-sm text-stone-700">
            <span className="flex flex-col">
              <span className="font-medium">{item.name}</span>
              <span className="text-[10px] text-stone-500">
                {item.variantName !== 'Default' ? `${item.variantName} · ` : ''}
                {item.quantity} × {formatPence(item.unitPricePence)}
              </span>
            </span>
            <span className="font-medium">{formatPence(item.lineTotalPence)}</span>
          </div>
        ))}

        <div className="border-t border-stone-100 pt-3 flex justify-between text-sm text-stone-600">
          <span>Subtotal</span>
          <span>{formatPence(order.subtotalPence)}</span>
        </div>
        <div className="flex justify-between text-sm text-stone-600">
          <span>Delivery</span>
          <span>
            {order.deliveryFeePence === 0 ? 'FREE' : formatPence(order.deliveryFeePence)}
          </span>
        </div>
        {order.discountPence > 0 && (
          <div className="flex justify-between text-sm text-[#155d2c] font-medium">
            <span>Discount</span>
            <span>-{formatPence(order.discountPence)}</span>
          </div>
        )}
        <div className="border-t border-stone-200 pt-3 flex justify-between text-base font-bold text-stone-900">
          <span>Total paid</span>
          <span>{formatPence(order.totalPence)}</span>
        </div>

        <div className="pt-2 text-xs text-stone-600">
          {order.fulfilment.method === 'delivery' ? (
            <p>
              Delivery
              {order.fulfilment.areaName ? ` to ${order.fulfilment.areaName}` : ''}
              {order.fulfilment.deliveryDate
                ? ` on ${formatLondonDate(order.fulfilment.deliveryDate, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}`
                : ''}
              .
            </p>
          ) : (
            <p>Collection from our shop.</p>
          )}
          {order.notes && <p className="mt-1 italic">“{order.notes}”</p>}
        </div>
      </div>
    </div>
  );
}

export const CheckoutSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { clearCart } = useCart();

  const [phase, setPhase] = useState<Phase>('loading');
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const cartCleared = useRef(false);

  const applyResult = useCallback(
    (result: OrderBySessionResult) => {
      switch (result.state) {
        case 'confirmed':
          setOrder(result.order);
          setPhase('confirmed');
          if (!cartCleared.current) {
            cartCleared.current = true;
            clearCart();
          }
          break;
        case 'unfulfilled':
          setPhase('unfulfilled');
          break;
        case 'not_found':
          setPhase('not_found');
          break;
        case 'pending':
          setPhase('pending');
          break;
      }
    },
    [clearCart],
  );

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async (currentAttempt: number) => {
      try {
        const response = await checkoutApi.getOrderBySession(sessionId);
        if (cancelled) return;
        setAttempt(currentAttempt);
        applyResult(response.data);

        if (response.data.state === 'pending' && currentAttempt < MAX_ATTEMPTS) {
          const delay = currentAttempt < QUICK_ATTEMPTS ? QUICK_POLL_MS : SLOW_POLL_MS;
          timer = setTimeout(() => void poll(currentAttempt + 1), delay);
        }
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'We could not check your payment status.',
        );
        setPhase('error');
      }
    };

    setPhase('loading');
    setErrorMessage(null);
    void poll(0);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId, applyResult, refreshKey]);

  const retry = () => {
    setRefreshKey((value) => value + 1);
  };

  if (!sessionId) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg bg-white p-8 rounded-2xl shadow-xl border border-stone-200 text-center">
          <AlertTriangle className="h-10 w-10 text-[#c9932b] mx-auto" aria-hidden="true" />
          <h1 className="font-serif text-2xl font-bold text-stone-900 mt-4">
            This link is incomplete
          </h1>
          <p className="mt-3 text-sm text-stone-600">
            We could not find a checkout reference in this link. If you have paid, check your
            email for the order confirmation.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link to="/orders/track">
              <Button variant="primary" size="md" className="w-full">
                Find my order
              </Button>
            </Link>
            <Link to="/shop">
              <Button variant="outline" size="md" className="w-full">
                Continue shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      fallback={
        <EmptyState
          title="Something went wrong"
          description="Please refresh the page. Your payment is safe; contact us if you are unsure."
        />
      }
    >
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-stone-200">
          {(phase === 'loading' || phase === 'pending') && (
            <div className="text-center" aria-live="polite">
              <div className="h-14 w-14 rounded-full bg-[#faf1de] text-[#8d5c2c] flex items-center justify-center mx-auto">
                <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
              </div>
              <h1 className="font-serif text-2xl font-bold text-stone-900 mt-4">
                Confirming your payment
              </h1>
              <p className="mt-3 text-sm text-stone-600">
                We are waiting for Stripe to confirm your payment and create your order. This
                usually takes a few seconds — please keep this page open.
              </p>
              {phase === 'pending' && attempt >= QUICK_ATTEMPTS && (
                <div className="mt-6 rounded-xl border border-[#f4e1ba] bg-[#faf1de] p-4 text-left">
                  <p className="text-xs text-[#73451c] flex items-start gap-2">
                    <Clock className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                    {attempt >= MAX_ATTEMPTS
                      ? 'We have stopped checking automatically. Your payment may still be processing — check your email, then find your order with your order number.'
                      : 'This is taking longer than usual, so we are checking less often. Some payment methods take a few minutes to settle. Please keep this page open.'}
                  </p>
                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={retry}
                      leftIcon={<RefreshCw className="h-4 w-4" />}
                    >
                      Check again
                    </Button>
                    <Link to="/orders/track">
                      <Button variant="ghost" size="sm" className="w-full">
                        Find my order
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {phase === 'confirmed' && order && (
            <div aria-live="polite">
              <div className="text-center">
                <div className="h-14 w-14 rounded-full bg-[#eaf5ee] text-[#155d2c] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
                </div>
                <h1 className="font-serif text-2xl font-bold text-stone-900 mt-4">
                  Thank you — your order is confirmed
                </h1>
                <p className="mt-2 text-sm text-stone-600">
                  A confirmation email is on its way. Keep your order number handy.
                </p>
              </div>

              <OrderSummary order={order} />

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link to="/shop" className="flex-1">
                  <Button variant="primary" size="md" className="w-full">
                    <ShoppingBag className="h-4 w-4 mr-2" aria-hidden="true" />
                    Continue shopping
                  </Button>
                </Link>
                <Link to="/orders/track" className="flex-1">
                  <Button variant="outline" size="md" className="w-full">
                    Find another order
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {phase === 'unfulfilled' && (
            <div className="text-center" aria-live="assertive">
              <div className="h-14 w-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="h-8 w-8" aria-hidden="true" />
              </div>
              <h1 className="font-serif text-2xl font-bold text-stone-900 mt-4">
                Payment received — action needed
              </h1>
              <p className="mt-3 text-sm text-stone-600">
                We received your payment but the items or delivery slot sold out before we could
                confirm the order. We will refund you in full and contact you shortly. No order
                has been created.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <Link to="/contact">
                  <Button variant="primary" size="md" className="w-full">
                    <Mail className="h-4 w-4 mr-2" aria-hidden="true" />
                    Contact us
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {phase === 'not_found' && (
            <div className="text-center" aria-live="polite">
              <div className="h-14 w-14 rounded-full bg-[#faf1de] text-[#8d5c2c] flex items-center justify-center mx-auto">
                <AlertTriangle className="h-7 w-7" aria-hidden="true" />
              </div>
              <h1 className="font-serif text-2xl font-bold text-stone-900 mt-4">
                We could not find this checkout
              </h1>
              <p className="mt-3 text-sm text-stone-600">
                This payment link is not recognised. If you completed a payment, find your order
                with your order number and email, or contact us.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <Link to="/orders/track">
                  <Button variant="primary" size="md" className="w-full">
                    Find my order
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button variant="outline" size="md" className="w-full">
                    Contact us
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {phase === 'error' && (
            <div className="text-center" aria-live="assertive">
              <div className="h-14 w-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="h-7 w-7" aria-hidden="true" />
              </div>
              <h1 className="font-serif text-2xl font-bold text-stone-900 mt-4">
                We could not check your payment
              </h1>
              <p className="mt-3 text-sm text-stone-600">
                {errorMessage ?? 'Please try again in a moment.'}
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <Button
                  variant="primary"
                  size="md"
                  onClick={retry}
                  leftIcon={<RefreshCw className="h-4 w-4" />}
                >
                  Try again
                </Button>
                <Link to="/contact">
                  <Button variant="outline" size="md" className="w-full">
                    Contact us
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};
