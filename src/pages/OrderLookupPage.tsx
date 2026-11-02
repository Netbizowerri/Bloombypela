/**
 * /orders/track
 *
 * Guest order lookup. Sends the order number and the email used at checkout to
 * the rate-limited `lookupGuestOrder` callable. The server returns the same
 * error for a wrong number and a wrong email, so this page cannot be used to
 * discover whether an order number exists.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Loader2, PackageSearch, Search } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { checkoutApi, type PublicOrder } from '../lib/checkout';
import { formatLondonDate, formatPence } from '../lib/utils';

type Status = 'idle' | 'loading' | 'found' | 'error';

export const OrderLookupPage: React.FC = () => {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    orderNumber.trim().length >= 3 && /.+@.+\..+/.test(email.trim()) && status !== 'loading';

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setStatus('loading');
    setError(null);
    setOrder(null);

    try {
      const response = await checkoutApi.lookupGuestOrder(orderNumber.trim(), email.trim());
      setOrder(response.data.order);
      setStatus('found');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'We could not find an order with those details.',
      );
      setStatus('error');
    }
  };

  return (
    <div className="min-h-[70vh] px-4 py-12">
      <div className="mx-auto w-full max-w-xl">
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-stone-200">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-[#faf1de] text-[#8d5c2c] flex items-center justify-center">
              <PackageSearch className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-stone-900">Find your order</h1>
              <p className="text-xs text-stone-600">
                Use the order number from your confirmation email.
              </p>
            </div>
          </div>

          <form className="mt-6 space-y-4" noValidate onSubmit={handleSubmit}>
            <Input
              label="Order number"
              placeholder="BBP-000123"
              value={orderNumber}
              onChange={(event) => setOrderNumber(event.target.value.toUpperCase())}
              autoComplete="off"
              required
            />
            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              disabled={!canSubmit}
              isLoading={status === 'loading'}
              leftIcon={<Search className="h-4 w-4" />}
            >
              {status === 'loading' ? 'Looking up your order…' : 'Find order'}
            </Button>
          </form>

          {status === 'loading' && (
            <p className="mt-6 flex items-center gap-2 text-xs text-stone-500" aria-live="polite">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Checking our records…
            </p>
          )}

          {status === 'error' && (
            <div
              className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800"
              role="alert"
            >
              <AlertTriangle className="h-4 w-4 inline mr-1" aria-hidden="true" />
              {error ?? 'We could not find an order with those details.'}
            </div>
          )}

          {status === 'found' && order && (
            <div className="mt-6" aria-live="polite">
              <div className="flex items-center gap-2 text-[#155d2c]">
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                <span className="font-medium text-sm">
                  Order {order.orderNumber} — {order.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="mt-4 rounded-xl border border-stone-200 bg-white overflow-hidden">
                <div className="p-4 space-y-3">
                  {order.items.map((item, index) => (
                    <div
                      key={`${item.name}-${index}`}
                      className="flex justify-between text-sm text-stone-700"
                    >
                      <span>
                        {item.quantity} × {item.name}
                        {item.variantName !== 'Default' ? ` (${item.variantName})` : ''}
                      </span>
                      <span>{formatPence(item.lineTotalPence)}</span>
                    </div>
                  ))}
                  <div className="border-t border-stone-100 pt-3 flex justify-between text-sm font-bold text-stone-900">
                    <span>Total</span>
                    <span>{formatPence(order.totalPence)}</span>
                  </div>
                  <p className="text-xs text-stone-600">
                    {order.fulfilment.method === 'delivery'
                      ? `Delivery${
                          order.fulfilment.deliveryDate
                            ? ` on ${formatLondonDate(order.fulfilment.deliveryDate, {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                              })}`
                            : ''
                        }`
                      : 'Collection from our shop'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-stone-500">
          Need help?{' '}
          <Link to="/contact" className="text-[#155d2c] font-medium hover:underline">
            Contact us
          </Link>
        </p>
      </div>
    </div>
  );
};
