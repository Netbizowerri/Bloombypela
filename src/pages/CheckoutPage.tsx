/**
 * Checkout page - full checkout UI up to (but not including) Stripe.
 *
 * Flow:
 *  1. Contact details (guest email/phone, or signed-in prefill)
 *  2. Fulfilment choice (delivery or collection if enabled)
 *  3. Delivery address
 *  4. Order notes, promo code, notices, terms consent
 *  5. Order summary with server-computed quote via quoteCart callable; while
 *     that callable is unavailable (Spark plan) a client-side estimate shows
 *     the type-based delivery charge and the delivery progress target.
 *
 * There is no postcode eligibility check and no delivery-date picker: juices
 * are sold as they are ordered. The postcode is still required so the server
 * can look up the delivery area when it prices the order.
 *
 * All pricing is computed server-side by quoteCart. Client-supplied prices
 * are ignored. Paying calls createCheckoutSession, which re-prices the basket
 * again, holds stock, and redirects to Stripe-hosted Checkout.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Mail,
  Phone,
  AlertTriangle,
  Info,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Truck,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatPence, formatLondonDate, UK_ALLERGENS } from '../lib/utils';
import { cld } from '../lib/cld';
import { isValidUKPostcode } from '../lib/postcode';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { EmptyState } from '../components/ui/EmptyState';
import { PageLoader } from '../components/ui/PageLoader';
import { deliveryApi } from '../lib/delivery';
import { usePublicSettings } from '../features/delivery';
import {
  DEFAULT_DELIVERY_PROGRESS_TARGET_PENCE,
  estimateShipping,
} from '../lib/shipping';
import { checkoutApi } from '../lib/checkout';
import type { CartItem } from '../types/cart';
import type { Product } from '../types/products';

type Fulfilment = 'delivery' | 'collection';

type CheckoutForm = {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  fulfilment: Fulfilment;
  addressLine1: string;
  addressLine2: string;
  addressCity: string;
  addressPostcode: string;
  orderNotes: string;
  promoCode: string;
  terms: boolean;
};

const EMPTY_FORM: CheckoutForm = {
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  fulfilment: 'delivery',
  addressLine1: '',
  addressLine2: '',
  addressCity: '',
  addressPostcode: '',
  orderNotes: '',
  promoCode: '',
  terms: false,
};

type QuoteData = {
  lines: Array<{
    productId: string;
    variantId: string;
    quantity: number;
    name: string;
    unitPricePence: number;
    lineTotalPence: number;
  }>;
  subtotalPence: number;
  deliveryFeePence: number;
  discountPence: number;
  totalPence: number;
  warnings: string[];
  promoApplied: boolean;
  promoCode: string | null;
  promoMessage: string | null;
};

export const CheckoutPage: React.FC = () => {
  const { items, subtotalPence: cartSubtotal, hasJuices, hasSnacks, totalItems, isLoading } = useCart();
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const { data: publicSettings } = usePublicSettings();
  const navigate = useNavigate();

  const [form, setForm] = useState<CheckoutForm>(() => ({
    ...EMPTY_FORM,
    contactName: user?.name ?? '',
    contactEmail: user?.email ?? '',
    contactPhone: user?.phone ?? '',
  }));

  const [step, setStep] = useState(1);
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [loading, setLoading] = useState<Set<string>>(new Set());

  /**
   * Indicative shipping, shown before (and without) the server quote. The
   * quote stays authoritative whenever it arrives; the server reprices again
   * at payment.
   */
  const shipping = useMemo(
    () =>
      estimateShipping({
        subtotalPence: cartSubtotal,
        hasSnacks,
        hasJuices,
        deliveryProgressTargetPence:
          publicSettings?.freeDeliveryThresholdPence ?? DEFAULT_DELIVERY_PROGRESS_TARGET_PENCE,
        fulfilment: form.fulfilment,
      }),
    [
      cartSubtotal,
      hasSnacks,
      hasJuices,
      publicSettings,
      form.fulfilment,
    ],
  );

  const displayDeliveryFeePence = quote ? quote.deliveryFeePence : shipping.deliveryFeePence;
  const displayTotalPence = quote
    ? quote.totalPence
    : cartSubtotal + shipping.deliveryFeePence;

  const isStepLoading = (key: string) => loading.has(key);

  // Prefill form from auth user on mount
  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        contactName: prev.contactName || user.name,
        contactEmail: prev.contactEmail || user.email,
        contactPhone: (prev.contactPhone || user.phone) ?? '',
      }));
    }
  }, [user]);

  // Recompute quote whenever form changes (debounced by React batching)
  const computeQuote = useCallback(async () => {
    if (items.length === 0) return;
    setLoading((prev) => new Set([...prev, 'quote']));
    try {
      const response = await deliveryApi.quoteCart({
        items: items.map((i) => ({
          productId: i.product.id,
          variantId: i.variant.id,
          quantity: i.quantity,
        })),
        postcode: form.fulfilment === 'delivery' ? form.addressPostcode : '',
        fulfilment: form.fulfilment,
        promoCode: form.promoCode || undefined,
      });
      setQuote(response.data);
      setQuoteError(null);
    } catch (err) {
      setQuote(null);
      setQuoteError(err instanceof Error ? err.message : 'Unable to compute quote');
    } finally {
      setLoading((prev) => {
        const next = new Set(prev);
        next.delete('quote');
        return next;
      });
    }
  }, [items, form.fulfilment, form.addressPostcode, form.promoCode]);

  useEffect(() => {
    computeQuote();
  }, [computeQuote]);

  // Form field handlers
  const setField = (key: keyof CheckoutForm, value: string | boolean | null) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggleFulfilment = (value: Fulfilment) => {
    setField('fulfilment', value);
  };

  const handleToggleTerms = () => {
    setField('terms', !form.terms);
  };

  const canProceed = useMemo(() => {
    if (items.length === 0) return false;
    if (form.contactName.trim().length < 2) return false;
    if (!form.contactEmail || !form.contactPhone) return false;
    if (form.fulfilment === 'delivery') {
      if (
        !form.addressLine1 ||
        !form.addressCity ||
        !isValidUKPostcode(form.addressPostcode)
      ) {
        return false;
      }
    }
    if (!form.terms) return false;
    return true;
  }, [items.length, form.contactName, form.contactEmail, form.contactPhone, form.fulfilment, form.addressLine1, form.addressCity, form.addressPostcode, form.terms]);

  const handlePay = useCallback(async () => {
    if (paying) return;
    if (!canProceed) {
      setPayError('Please complete all required details before paying.');
      return;
    }

    setPaying(true);
    setPayError(null);

    try {
      const response = await checkoutApi.createCheckoutSession({
        items: items.map((item) => ({
          productId: item.product.id,
          variantId: item.variant.id,
          quantity: item.quantity,
        })),
        contact: {
          name: form.contactName.trim(),
          email: form.contactEmail.trim(),
          phone: form.contactPhone.trim(),
        },
        fulfilment: form.fulfilment,
        address:
          form.fulfilment === 'delivery'
            ? {
                line1: form.addressLine1.trim(),
                line2: form.addressLine2.trim() || null,
                city: form.addressCity.trim(),
                postcode: form.addressPostcode.trim(),
              }
            : null,
        notes: form.orderNotes.trim() || undefined,
        promoCode: form.promoCode.trim() || undefined,
      });

      // Prices, totals and stock are already revalidated server-side. Send the
      // customer to Stripe-hosted Checkout; the cart is only cleared once the
      // verified webhook has created the order on the success page.
      window.location.assign(response.data.url);
    } catch (err) {
      setPayError(
        err instanceof Error
          ? err.message
          : 'Unable to start payment. Please try again.',
      );
      setPaying(false);
    }
  }, [paying, canProceed, items, form]);

  // Wait for the live catalogue before deciding the basket is empty: stored
  // lines cannot be resolved until Firestore answers.
  if (isLoading) {
    return <PageLoader />;
  }

  // Empty cart guard
  if (items.length === 0) {
    return (
      <ErrorBoundary
        fallback={<EmptyState title="Basket empty" description="Add items to your basket before checking out." />}
      >
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-lg bg-white p-8 rounded-2xl shadow-xl border border-stone-200 text-center">
            <div className="h-14 w-14 rounded-full bg-[#faf1de] text-[#8d5c2c] flex items-center justify-center mb-4 mx-auto">
              <AlertTriangle className="h-7 w-7" aria-hidden="true" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-stone-900">Your basket is empty</h1>
            <p className="mt-3 text-xs text-stone-600 leading-relaxed">
              Add some snacks or juices to your basket before checking out.
            </p>
            <div className="mt-6">
              <Link to="/shop">
                <Button variant="primary" size="md" className="w-full" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                  Continue shopping
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  const lineItems = items.map((item) => ({
    productId: item.product.id,
    variantId: item.variant.id,
    quantity: item.quantity,
    name: item.product.name,
    unitPricePence: item.variant.pricePence,
    lineTotalPence: item.variant.pricePence * item.quantity,
  }));

  return (
    <ErrorBoundary
      fallback={
        <EmptyState
          title="Checkout error"
          description="An unexpected error occurred. Please refresh and try again."
        />
      }
    >
      <div className="min-h-[70vh] px-4 py-8">
        <nav className="mb-6 flex items-center gap-2 text-xs text-stone-500">
          <Link to="/cart" className="hover:text-stone-900">
            Basket
          </Link>
          <span className="text-stone-300">/</span>
          <span className="text-stone-900 font-medium">Checkout</span>
        </nav>

        <h1 className="font-serif text-3xl font-bold text-stone-900 mb-1">
          Checkout
        </h1>
        <p className="text-xs text-stone-600 mb-8">
          Review your order and delivery details.{' '}
          <span className="font-semibold text-[#155d2c]">Final price confirmed at payment.</span>
        </p>

        <form
          noValidate
          className="space-y-8 max-w-4xl mx-auto"
          onSubmit={(event) => {
            event.preventDefault();
            void handlePay();
          }}
        >
          {/* Section 1: Contact */}
          <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
            <h2 className="font-serif text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5 text-[#7e2c44]" />
              Contact details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full name"
                type="text"
                autoComplete="name"
                value={form.contactName}
                onChange={(e) => setField('contactName', e.target.value)}
                error={
                  form.contactName.length > 0 && form.contactName.trim().length < 2
                    ? 'Please enter your full name'
                    : !form.contactName
                      ? 'Name is required'
                      : undefined
                }
              />
              <Input
                label="Email address"
                type="email"
                value={form.contactEmail}
                onChange={(e) => setField('contactEmail', e.target.value)}
                error={!form.contactEmail ? 'Email is required' : undefined}
                disabled={!!user}
              />
              <Input
                label="Phone number"
                type="tel"
                value={form.contactPhone}
                onChange={(e) => setField('contactPhone', e.target.value)}
                error={!form.contactPhone ? 'Phone is required' : undefined}
              />
            </div>
            {user && (
              <p className="mt-3 text-[10px] text-stone-500">
                Signed in as <strong>{user.name}</strong> ({user.email}). Details prefilled from your account.
              </p>
            )}
          </section>

          {/* Section 2: Fulfilment */}
          <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
            <h2 className="font-serif text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-[#7e2c44]" />
              How would you like to receive your order?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleToggleFulfilment('delivery')}
                className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                  form.fulfilment === 'delivery'
                    ? 'border-[#155d2c] bg-[#f0f7f2] text-[#155d2c]'
                    : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                }`}
              >
                <Truck className="h-6 w-6 mb-2" />
                <span className="font-medium text-sm">Delivery</span>
                <span className="text-[10px] text-stone-500">
                  Newcastle & Gateshead areas
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleFulfilment('collection')}
                className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                  form.fulfilment === 'collection'
                    ? 'border-[#155d2c] bg-[#f0f7f2] text-[#155d2c]'
                    : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                }`}
                disabled={!true}
              >
                <MapPin className="h-6 w-6 mb-2" />
                <span className="font-medium text-sm">Collection</span>
                <span className="text-[10px] text-stone-500">
                  Click & collect at our shop
                </span>
              </button>
            </div>
          </section>

          {/* Section 3: Address (delivery only) */}
          {form.fulfilment === 'delivery' && (
            <>
              <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
                <h2 className="font-serif text-lg font-bold text-stone-900 mb-4">
                  Delivery address
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Address line 1"
                    value={form.addressLine1}
                    onChange={(e) => setField('addressLine1', e.target.value)}
                    error={!form.addressLine1 ? 'Address line 1 is required' : undefined}
                  />
                  <Input
                    label="Address line 2 (optional)"
                    value={form.addressLine2}
                    onChange={(e) => setField('addressLine2', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <Input
                    label="City / town"
                    value={form.addressCity}
                    onChange={(e) => setField('addressCity', e.target.value)}
                    error={!form.addressCity ? 'City is required' : undefined}
                  />
                  <Input
                    label="UK postcode"
                    autoComplete="postal-code"
                    value={form.addressPostcode}
                    onChange={(e) => setField('addressPostcode', e.target.value.toUpperCase())}
                    error={
                      !form.addressPostcode
                        ? 'Postcode is required'
                        : !isValidUKPostcode(form.addressPostcode)
                          ? 'Enter a valid UK postcode'
                          : undefined
                    }
                  />
                </div>
              </section>
            </>
          )}

          {/* Section 5: Order notes + promo */}
          <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
            <h2 className="font-serif text-lg font-bold text-stone-900 mb-4">
              Order notes &amp; promotions
            </h2>
            <Input
              label="Order notes (optional)"
              value={form.orderNotes}
              onChange={(e) => setField('orderNotes', e.target.value)}
              helperText="Anything we should know about your order?"
            />
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Promo code"
                value={form.promoCode}
                onChange={(e) => setField('promoCode', e.target.value.toUpperCase())}
                helperText="Enter a discount code if you have one"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  // Trigger quote recompute (useEffect handles it)
                }}
                disabled={isStepLoading('quote')}
              >
                Apply
              </Button>
              {quote?.promoMessage && (
                <p className={`mt-2 text-xs font-medium ${quote.promoApplied ? 'text-[#155d2c]' : 'text-red-600'}`}>
                  {quote.promoMessage}
                </p>
              )}
              {quoteError && (
                <p className="mt-2 text-xs text-red-600">{quoteError}</p>
              )}
            </div>
          </section>

          {/* Notices */}
          <section className="bg-[#faf1de] rounded-2xl border border-[#f4e1ba] p-6 text-xs text-[#73451c]">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-bold">
                  Allergen &amp; perishable goods notice
                </p>
                <p>
                  Our juices are raw, cold-pressed and unpasteurised. Please ensure someone is available
                  at the delivery address to receive and refrigerate your bottles immediately (store below
                  4°C). Consume within 5 days of delivery.
                </p>
                <p className="mt-2">
                  Our kitchen handles the 14 major UK allergens. While we take care to avoid cross-contact,
                  we cannot guarantee any product is allergen-free.
                </p>
              </div>
            </div>
          </section>

          {/* Consent */}
          <section className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
            <label className="flex items-start gap-3 cursor-pointer text-sm text-stone-700">
              <input
                type="checkbox"
                checked={form.terms}
                onChange={handleToggleTerms}
                className="w-3 h-3 rounded border-stone-300 text-[#155d2c] focus:ring-[#155d2c] mt-0.5"
              />
              <div className="leading-relaxed">
                I agree to the{' '}
                <Link to="/terms" className="text-[#155d2c] hover:underline font-medium">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-[#155d2c] hover:underline font-medium">
                  Privacy Policy
                </Link>
                . I understand that final pricing is confirmed at payment and that juice deliveries require
                someone to be present to receive and refrigerate the order.
              </div>
            </label>
            {!form.terms && (
              <p className="mt-2 text-xs text-red-600">
                You must agree to the terms to continue.
              </p>
            )}
          </section>

          {/* Order summary */}
          <section className="bg-white rounded-2xl border border-stone-200 shadow-sm">
            <div className="p-6 border-b border-stone-100">
              <h2 className="font-serif text-lg font-bold text-stone-900">
                Order summary
              </h2>
              <p className="text-[10px] text-stone-500 mt-1 uppercase tracking-wider font-semibold">
                Indicative totals - final price confirmed at payment
              </p>
            </div>
            <div className="p-6 space-y-3">
              {lineItems.map((line) => (
                <div key={line.productId + '-' + line.variantId} className="flex justify-between text-sm text-stone-700">
                  <span className="flex flex-col">
                    <span className="font-medium">{line.name}</span>
                    <span className="text-[10px] text-stone-500">
                      {line.quantity} × {formatPence(line.unitPricePence)}
                    </span>
                  </span>
                  <span className="font-medium">{formatPence(line.lineTotalPence)}</span>
                </div>
              ))}
              <div className="border-t border-stone-100 pt-3 flex justify-between text-sm text-stone-600 font-medium">
                <span>Subtotal</span>
                <span>{formatPence(quote?.subtotalPence ?? cartSubtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-stone-600">
                <span>{form.fulfilment === 'collection' ? 'Collection' : 'Delivery'}</span>
                <span className={displayDeliveryFeePence === 0 ? 'font-semibold text-[#155d2c]' : ''}>
                  {displayDeliveryFeePence === 0 ? 'FREE' : formatPence(displayDeliveryFeePence)}
                </span>
              </div>
              {!quote && (
                <p className="text-[10px] text-stone-500">
                  {form.fulfilment === 'collection'
                    ? 'Collection - no delivery charge.'
                    : shipping.amountToDeliveryPence > 0
                      ? `Add ${formatPence(shipping.amountToDeliveryPence)} more for Newcastle Delivery!`
                      : 'Newcastle delivery charge applies.'}
                </p>
              )}
              {quote?.discountPence && quote?.discountPence > 0 && quote && (
                <div className="flex justify-between text-sm text-[#155d2c] font-medium">
                  <span>Discount ({quote.promoCode})</span>
                  <span>-{formatPence(quote.discountPence)}</span>
                </div>
              )}
              {quote && quote.warnings.length > 0 && (
                <div className="mt-2 p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800">
                  {quote.warnings.map((w, i) => (
                    <div key={i} className="mb-1">
                      <AlertTriangle className="h-3 w-3 inline mr-1 mt-0.5" /> {w}
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 border-t border-stone-200 pt-3 flex justify-between text-base font-bold text-stone-900">
                <span>Total</span>
                <span>{formatPence(displayTotalPence)}</span>
              </div>
            </div>
            <div className="p-6 border-t border-stone-100">
              <p className="text-[10px] text-stone-500 mb-3 uppercase tracking-wider font-semibold">
                Payment
              </p>
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full"
                disabled={!canProceed || paying}
                isLoading={paying}
              >
                {paying
                  ? 'Redirecting to secure payment...'
                  : !canProceed
                    ? 'Complete details to continue'
                    : 'Pay securely'}
              </Button>
              {payError && (
                <p className="mt-3 text-xs text-red-600" role="alert">
                  <AlertTriangle className="h-3 w-3 inline mr-1" aria-hidden="true" />
                  {payError}
                </p>
              )}
              <p className="mt-2 text-[10px] text-stone-500 text-center">
                You will be redirected to Stripe to pay by card, Apple Pay or Google Pay.
                Your order is confirmed only after Stripe confirms payment.
              </p>
            </div>
          </section>
        </form>
      </div>
    </ErrorBoundary>
  );
};
