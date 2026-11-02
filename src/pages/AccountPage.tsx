import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../hooks/useRole';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import type { BadgeProps } from '../components/ui/Badge';
import { formatPence, formatLondonDate } from '../lib/utils';
import {
  User,
  ShoppingBag,
  RotateCcw,
  MapPin,
  Shield,
  LogOut,
  Calendar,
  AlertTriangle,
  Download,
  Trash2,
  CheckCircle2,
  Clock,
  ChevronRight,
  Loader2,
  Package,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Modal } from '../components/ui/Modal';
import { ordersApi, ordersRepository } from '../lib/orders';
import type { OrderRecord } from '../types/orders';

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmed',
  preparing: 'Being prepared',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  collected: 'Collected',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  partially_refunded: 'Partially refunded',
};

const STATUS_BADGE: Record<string, string> = {
  confirmed: 'gold',
  preparing: 'gold',
  out_for_delivery: 'gold',
  delivered: 'green',
  collected: 'green',
  cancelled: 'neutral',
  refunded: 'neutral',
  partially_refunded: 'neutral',
};

export const AccountPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const { role, isStaff } = useRole();
  const { success } = useToast();
  const [activeTab, setActiveTab] = useState<'orders' | 'subscriptions' | 'addresses' | 'privacy'>('orders');

  const [subPaused, setSubPaused] = useState(false);
  const [subSkipped, setSubSkipped] = useState(false);

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  const [openOrder, setOpenOrder] = useState<OrderRecord | null>(null);
  const [reordering, setReordering] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    if (!user) {
      setOrders([]);
      setOrdersLoading(false);
      return;
    }
    setOrdersLoading(true);
    try {
      const loaded = await ordersRepository.listOrdersByUser(user.uid, user.email);
      setOrders(loaded);
    } catch (err) {
      setOrdersError(err instanceof Error ? err.message : 'Unable to load orders.');
    } finally {
      setOrdersLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const handleReorder = (order: OrderRecord) => {
    setReordering(order.orderNumber);
    setTimeout(() => {
      success('Reorder noted', 'Add items to your basket from the shop.');
      setReordering(null);
    }, 600);
  };

  const renderOrdersTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-bold text-stone-900">Order History</h3>
        <span className="text-xs text-stone-500">{orders.length} order recorded</span>
      </div>

      {ordersLoading && (
        <div className="py-10 text-center text-stone-500 text-xs">
          <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
          Loading orders…
        </div>
      )}

      {ordersError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">
          {ordersError}
        </div>
      )}

      {!ordersLoading && orders.length === 0 && (
        <div className="py-12 text-center text-stone-400 text-xs">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No orders yet.</p>
          <p className="mt-1 text-[10px] text-stone-400">
            Place your first order to see it here.
          </p>
        </div>
      )}

      {!ordersLoading &&
        orders.map((ord) => (
          <div
            key={ord.orderNumber}
            className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-4 gap-2">
              <div>
                <span className="text-xs font-bold text-[#7e2b44]">{ord.orderNumber}</span>
                <p className="text-xs text-stone-500">
                  Placed on{' '}
                  {ord.createdAt
                    ? formatLondonDate(ord.createdAt as Date | string | number, {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'}
                  • {ord.fulfilment.areaName ?? ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={(STATUS_BADGE[ord.status] ?? 'neutral') as BadgeProps['variant']} size="sm">
                  {STATUS_LABELS[ord.status] ?? ord.status}
                </Badge>
                <span className="font-serif text-lg font-bold text-stone-900">
                  {formatPence(ord.totalPence)}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-stone-700">
              {ord.items.map((item: OrderRecord['items'][number], idx: number) => (
                <div key={idx} className="flex justify-between items-center py-1">
                  <span>
                    {item.quantity} × {item.name}
                  </span>
                  <span className="font-medium text-stone-900">{formatPence(item.lineTotalPence)}</span>
                </div>
              ))}
              <div className="border-t border-stone-100 pt-2 flex justify-between text-[10px] font-semibold text-stone-500">
                <span>Total</span>
                <span>{formatPence(ord.totalPence)}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpenOrder(ord)}
                className="text-xs font-medium text-[#7e2b44] hover:underline flex items-center gap-1"
              >
                View details <ChevronRight className="h-3 w-3" />
              </button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReorder(ord)}
                disabled={reordering === ord.orderNumber}
              >
                {reordering === ord.orderNumber ? 'Saving…' : 'Reorder Items'}
              </Button>
            </div>
          </div>
        ))}

      {openOrder && (
        <Modal
          isOpen={!!openOrder}
          onClose={() => setOpenOrder(null)}
          title={`Order ${openOrder.orderNumber}`}
          maxWidth="lg"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">
                  Customer
                </p>
                <p className="text-sm font-medium">{openOrder.contact.name}</p>
                <p className="text-xs text-stone-500">{openOrder.contact.email}</p>
                <p className="text-xs text-stone-500">{openOrder.contact.phone}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">
                  Fulfilment
                </p>
                <p className="text-sm font-medium">
                  {openOrder.fulfilment.method === 'delivery'
                    ? `Delivery to ${openOrder.fulfilment.areaName ?? 'address'}`
                    : 'Collection from shop'}
                </p>
                <p className="text-xs text-stone-500">
                  {openOrder.fulfilment.deliveryDate
                      ? `Date: ${formatLondonDate(openOrder.fulfilment.deliveryDate as Date | string | number, { dateStyle: 'medium' })}`
                    : '—'}
                </p>
              </div>
            </div>

            <div className="border-t border-stone-100 pt-4">
              <p className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold mb-3">
                Items
              </p>
              <div className="space-y-2">
                {openOrder.items.map((item: OrderRecord['items'][number], idx: number) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center py-2 border-b border-stone-50 text-sm"
                  >
                    <div>
                      <span className="font-medium text-stone-800">{item.name}</span>
                      {item.variantName && item.variantName.toLowerCase() !== 'default' && (
                        <span className="text-xs text-stone-500 block">— {item.variantName}</span>
                      )}
                      <span className="text-xs text-stone-500">
                        {item.quantity} × {formatPence(item.unitPricePence)}
                      </span>
                    </div>
                    <span className="font-medium">{formatPence(item.lineTotalPence)}</span>
                  </div>
                ))}
                <div className="border-t border-stone-100 pt-2 flex justify-between text-sm font-bold text-stone-900">
                  <span>Total</span>
                  <span>{formatPence(openOrder.totalPence)}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-stone-100 pt-4">
              <p className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold mb-3">
                Status timeline
              </p>
              <div className="space-y-3">
                {[...openOrder.statusHistory].reverse().map((h: OrderRecord['statusHistory'][number], idx: number) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-[#155d2c]" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-stone-800">
                        {STATUS_LABELS[h.status] ?? h.status}
                      </p>
                      <p className="text-xs text-stone-500">
                        {h.at ? formatLondonDate(h.at as Date | string | number, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                      </p>
                      {h.note && (
                        <p className="text-xs text-stone-500 italic">“{h.note}”</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {openOrder.notes && (
                <div className="mt-4 p-3 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-800">
                  <p className="font-bold mb-1">Customer note</p>
                  <p>{openOrder.notes}</p>
                </div>
              )}
              {openOrder.internalNote && (
                <div className="mt-3 p-3 rounded-lg border border-stone-200 bg-stone-50 text-xs text-stone-600">
                  <p className="font-bold mb-1">Internal note</p>
                  <p>{openOrder.internalNote}</p>
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReorder(openOrder)}
                disabled={reordering === openOrder.orderNumber}
              >
                {reordering === openOrder.orderNumber ? 'Saving…' : 'Reorder Items'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );

  const renderSubscriptionsTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <h3 className="font-serif text-xl font-bold text-stone-900">Weekly Bloom 5</h3>
            <Badge variant={subPaused ? 'gold' : subSkipped ? 'neutral' : 'green'}>
              {subPaused ? 'Paused' : subSkipped ? 'Next Delivery Skipped' : 'Active'}
            </Badge>
          </div>
        </div>
        <p className="text-xs text-stone-500">
          Subscription details are managed via the Stripe customer portal.
        </p>
      </div>
    </div>
  );

  const renderAddressesTab = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-serif text-base font-bold text-stone-900">Default Delivery Address</h4>
          <Badge variant="green">Primary</Badge>
        </div>
        <p className="text-xs text-stone-700 leading-relaxed">
          {user?.name}<br />
          14 Osborne Road, Jesmond<br />
          Newcastle upon Tyne, NE2 2AZ<br />
          United Kingdom
        </p>
      </div>
    </div>
  );

  const renderPrivacyTab = () => (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-6">
      <h3 className="font-serif text-xl font-bold text-stone-900">
        Your Data Privacy Rights (UK GDPR)
      </h3>
      <p className="text-xs text-stone-500 mt-1">
        Bloom by Pela values your data sovereignty. You can export or request erasure of your account data at any time.
      </p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 text-left">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-[#7e2b44] text-white flex items-center justify-center font-serif text-2xl font-bold">
            {user?.name?.charAt(0).toUpperCase() || 'P'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl font-bold text-stone-900">{user?.name}</h1>
              <Badge variant={role === 'admin' ? 'burgundy' : 'gold'}>
                {role.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">{user?.email}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isStaff && (
            <Link to="/admin">
              <Button variant="primary" size="sm" leftIcon={<Shield className="h-4 w-4" />}>
                Go to Admin Portal
              </Button>
            </Link>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={signOut}
            leftIcon={<LogOut className="h-4 w-4" />}
          >
            Sign Out
          </Button>
        </div>
      </div>

      <div className="border-b border-stone-200 flex gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'border-[#7e2b44] text-[#7e2b44] font-semibold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <ShoppingBag className="h-4 w-4" />
          <span>Order History</span>
        </button>
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'subscriptions'
              ? 'border-[#7e2b44] text-[#7e2b44] font-semibold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <RotateCcw className="h-4 w-4" />
          <span>My Subscriptions</span>
        </button>
        <button
          onClick={() => setActiveTab('addresses')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'addresses'
              ? 'border-[#7e2b44] text-[#7e2b44] font-semibold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <MapPin className="h-4 w-4" />
          <span>Saved Addresses</span>
        </button>
        <button
          onClick={() => setActiveTab('privacy')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'privacy'
              ? 'border-[#7e2b44] text-[#7e2b44] font-semibold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Shield className="h-4 w-4" />
          <span>Privacy & GDPR</span>
        </button>
      </div>

      {activeTab === 'orders' && renderOrdersTab()}
      {activeTab === 'subscriptions' && renderSubscriptionsTab()}
      {activeTab === 'addresses' && renderAddressesTab()}
      {activeTab === 'privacy' && renderPrivacyTab()}
    </div>
  );
};
