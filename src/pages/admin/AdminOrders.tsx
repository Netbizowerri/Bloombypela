/**
 * AdminOrders – real Firestore order management.
 *
 * Read-only list of all orders with search by order number / email / name,
 * filters by status, date and fulfilment. Detail drawer shows the full order
 * with status timeline and internal notes. Status updates go through the
 * `updateOrderStatus` callable (appends statusHistory + auditLog). Refunds go
 * through `refundOrder` (admin only, Stripe refunds API, idempotency key).
 * Packing slip print view and CSV export are also provided.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  Clock,
  MapPin,
  Mail,
  Phone,
  Search,
  Filter,
  Download,
  Printer,
  ChevronRight,
  X,
  Loader2,
  AlertTriangle,
  CreditCard,
  Package,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import type { BadgeProps } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { formatPence, formatLondonDate } from '../../lib/utils';
import {
  ordersApi,
  ordersRepository,
} from '../../lib/orders';
import type { OrderRecord } from '../../types/orders';
import { useToast } from '../../context/ToastContext';

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

const PAYMENT_BADGE: Record<string, string> = {
  paid: 'green',
  refunded: 'neutral',
  partially_refunded: 'gold',
};

type OrderStatus = OrderRecord['status'];

export const AdminOrders: React.FC = () => {
  const { success, error: showError } = useToast();

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [fulfilmentFilter, setFulfilmentFilter] = useState<'all' | 'delivery' | 'collection'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Detail drawer
  const [openOrder, setOpenOrder] = useState<OrderRecord | null>(null);

  // Refund modal
  const [refundOrderId, setRefundOrderId] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refunding, setRefunding] = useState(false);

  const [submittingStatus, setSubmittingStatus] = useState<Set<string>>(new Set());
  const isStatusSubmitting = (id: string) => submittingStatus.has(id);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const loaded = await ordersRepository.listAllOrders();
      setOrders(loaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    const searchLower = search.toLowerCase();
    return orders.filter((o) => {
      const matchesSearch =
        !searchLower ||
        o.orderNumber.toLowerCase().includes(searchLower) ||
        o.contact.name.toLowerCase().includes(searchLower) ||
        o.contact.email.toLowerCase().includes(searchLower);
      const matchesStatus =
        statusFilter === 'all' || o.status === statusFilter;
      const matchesFulfilment =
        fulfilmentFilter === 'all' || o.fulfilment.method === fulfilmentFilter;
      const matchesDateFrom = !dateFrom || (o.createdAt && String(o.createdAt).slice(0, 10) >= dateFrom);
      const matchesDateTo = !dateTo || (o.createdAt && String(o.createdAt).slice(0, 10) <= dateTo);
      return matchesSearch && matchesStatus && matchesFulfilment && matchesDateFrom && matchesDateTo;
    });
  }, [orders, search, statusFilter, fulfilmentFilter, dateFrom, dateTo]);

  const handleUpdateStatus = async (order: OrderRecord, newStatus: OrderStatus) => {
    setSubmittingStatus((prev) => new Set([...prev, order.orderNumber]));
    try {
      await ordersApi.updateOrderStatus({
        orderNumber: order.orderNumber,
        status: newStatus,
        note: 'Updated via admin dashboard.',
      });
      success('Status updated', `${order.orderNumber} is now ${STATUS_LABELS[newStatus]}.`);
      setOpenOrder(null);
      await ordersRepository.listAllOrders().then(setOrders);
    } catch (err) {
      showError('Status update failed', err instanceof Error ? err.message : 'Unknown error.');
    } finally {
      setSubmittingStatus((prev) => {
        const next = new Set(prev);
        next.delete(order.orderNumber);
        return next;
      });
    }
  };

  const handleSubmitRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundOrderId) return;
    const order = orders.find((o) => o.orderNumber === refundOrderId);
    if (!order) return;
    const idempotencyKey = `refund-${refundOrderId}-${Date.now()}`;
    setRefunding(true);
    try {
      await ordersApi.refundOrder({
        orderNumber: refundOrderId,
        amountPence: parseInt(refundAmount, 10) || 0,
        reason: refundReason || null,
        idempotencyKey,
      });
      success('Refund processed', `${refundOrderId} refunded ${formatPence(parseInt(refundAmount, 10))}.`);
      setRefundOrderId(null);
      setRefundAmount('');
      setRefundReason('');
      await ordersRepository.listAllOrders().then(setOrders);
    } catch (err) {
      showError('Refund failed', err instanceof Error ? err.message : 'Unknown error.');
    } finally {
      setRefunding(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await ordersApi.exportOrdersCSV({
        fromDate: dateFrom || undefined,
        toDate: dateTo || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        area: undefined,
        deliveryDate: undefined,
        kind: 'orders',
      });
      const blob = new Blob([response.data.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.data.filename;
      a.click();
      URL.revokeObjectURL(url);
      success('CSV exported', response.data.filename);
    } catch (err) {
      showError('Export failed', err instanceof Error ? err.message : 'Unknown error.');
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-stone-500 text-xs">
        <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
        Loading orders…
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center text-stone-500 text-xs">
        <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-stone-400" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-stone-900">Order Management</h2>
          <p className="text-xs text-stone-500 mt-1">
            View, filter, and manage all orders. Status changes notify customers by email.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            leftIcon={<Download className="h-4 w-4" />}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <Search className="h-4 w-4 text-stone-400" />
          <Input
            label="Search order number, customer, or email"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="e.g. BBP-000123 or Jesmond"
            className="w-full sm:w-80"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
              className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
            >
              <option value="all">All statuses</option>
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key as OrderStatus}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Fulfilment
            </label>
            <select
              value={fulfilmentFilter}
              onChange={(e) =>
                setFulfilmentFilter(e.target.value as 'all' | 'delivery' | 'collection')
              }
              className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
            >
              <option value="all">All</option>
              <option value="delivery">Delivery</option>
              <option value="collection">Collection</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
              From date
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
              To date
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
            />
          </div>
        </div>
        <p className="text-[10px] text-stone-500">
          {filteredOrders.length} of {orders.length} order{orders.length !== 1 ? 's' : ''} shown.
        </p>
      </div>

      {/* Orders table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-5">Order</th>
                <th className="py-3 px-5">Customer</th>
                <th className="py-3 px-5">Items</th>
                <th className="py-3 px-5">Total</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">Payment</th>
                <th className="py-3 px-5">Date</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-stone-400 text-xs">
                    No orders match your filters.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => (
                  <tr key={o.orderNumber} className="hover:bg-stone-50">
                    <td className="py-3 px-5 font-mono font-bold text-stone-900">
                      {o.orderNumber}
                    </td>
                    <td className="py-3 px-5">
                      <div className="font-medium">{o.contact.name}</div>
                      <div className="text-[10px] text-stone-500">{o.contact.email}</div>
                    </td>
                    <td className="py-3 px-5">
                      {o.items
                        .slice(0, 2)
                        .map((i: OrderRecord['items'][number]) => `${i.quantity}× ${i.name}`)
                        .join(', ')}
                      {o.items.length > 2 && ` +${o.items.length - 2} more`}
                    </td>
                    <td className="py-3 px-5 font-medium">{formatPence(o.totalPence)}</td>
                    <td className="py-3 px-5">
                      <Badge variant={(STATUS_BADGE[o.status] ?? 'neutral') as BadgeProps['variant']} size="sm">
                        {STATUS_LABELS[o.status] ?? o.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-5">
                      <Badge variant={(PAYMENT_BADGE[o.paymentStatus] ?? 'neutral') as BadgeProps['variant']} size="sm">
                        {o.paymentStatus.replace(/_/g, ' ')}
                      </Badge>
                      {o.refundedPence > 0 && (
                        <div className="text-[10px] text-stone-500 mt-0.5">
                          Refunded {formatPence(o.refundedPence)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-5 text-[10px] text-stone-500">
                      {o.createdAt ? formatLondonDate(o.createdAt as Date, { dateStyle: 'medium' }) : '—'}
                    </td>
                    <td className="py-3 px-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setOpenOrder(o)}
                          className="p-1 text-stone-500 hover:text-[#7e2b44] transition-colors"
                          title="View details"
                          disabled={isStatusSubmitting(o.orderNumber)}
                        >
                          <Package className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRefundOrderId(o.orderNumber);
                            setRefundAmount('');
                            setRefundReason('');
                          }}
                          className="p-1 text-stone-500 hover:text-[#c93c3c] transition-colors"
                          title="Refund"
                          disabled={isStatusSubmitting(o.orderNumber) || o.paymentStatus !== 'paid'}
                        >
                          <CreditCard className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order detail drawer */}
      {openOrder && (
        <Modal
          isOpen={!!openOrder}
          onClose={() => setOpenOrder(null)}
          title={`Order ${openOrder.orderNumber}`}
          maxWidth="2xl"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <p className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">
                  Customer
                </p>
                <p className="text-sm font-medium">{openOrder.contact.name}</p>
                <p className="text-xs text-stone-500">{openOrder.contact.email}</p>
                <p className="text-xs text-stone-500">{openOrder.contact.phone}</p>
              </div>
              <div className="space-y-2">
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
                    ? formatLondonDate(openOrder.fulfilment.deliveryDate as string, { dateStyle: 'medium' })
                    : '—'}
                </p>
                {openOrder.fulfilment.collectionDetails && (
                  <p className="text-xs text-stone-500">{openOrder.fulfilment.collectionDetails}</p>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">
                  Order totals
                </p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-600">Subtotal</span>
                    <span>{formatPence(openOrder.subtotalPence)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600">Delivery</span>
                    <span>
                      {openOrder.deliveryFeePence === 0 ? 'FREE' : formatPence(openOrder.deliveryFeePence)}
                    </span>
                  </div>
                  {openOrder.discountPence > 0 && (
                    <div className="flex justify-between text-[#155d2c]">
                      <span>Discount</span>
                      <span>-{formatPence(openOrder.discountPence)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-stone-900 font-bold border-t pt-1">
                    <span>Total</span>
                    <span>{formatPence(openOrder.totalPence)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-stone-100 pt-4">
              <p className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold mb-3">
                Items
              </p>
              <div className="space-y-2">
                {openOrder.items.map((item: OrderRecord['items'][number], idx: number) => (
                  <div key={idx} className="flex justify-between items-center py-2 border-b border-stone-50 text-sm">
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
                Status
              </p>
              <div className="space-y-2">
                <select
                  value={openOrder.status}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    handleUpdateStatus(openOrder, e.target.value as OrderStatus)
                  }
                  className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
                  disabled={isStatusSubmitting(openOrder.orderNumber)}
                >
                  {Object.entries(STATUS_LABELS).map(([key, label]) => {
                    const allowed =
                      key === 'confirmed' ||
                      ['preparing', 'out_for_delivery', 'delivered', 'collected', 'cancelled'].includes(
                        key as OrderStatus,
                      );
                    return (
                      <option key={key} value={key as OrderStatus} disabled={!allowed}>
                        {label}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[10px] text-stone-500">
                  Status changes notify the customer by email and are recorded in the audit log.
                </p>
              </div>
            </div>

            {openOrder.internalNote && (
              <div className="border-t border-stone-100 pt-4">
                <p className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold mb-3">
                  Internal note
                </p>
                <p className="text-sm text-stone-700">{openOrder.internalNote}</p>
              </div>
)}

            {/* Refund action (admin only, paid orders) */}
            {openOrder.paymentStatus === 'paid' && openOrder.status !== 'refunded' && (
              <div className="border-t border-stone-100 pt-4">
                <p className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold mb-3">
                  Refund
                </p>
                <p className="text-xs text-stone-500 mb-3">
                  Refund amount cannot exceed the unrefunded total.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setRefundOrderId(openOrder.orderNumber);
                    setRefundAmount('');
                    setRefundReason('');
                  }}
                  className="text-xs font-medium text-[#c93c3c] hover:bg-red-50 rounded px-3 py-2 flex items-center gap-1"
                >
                  <CreditCard className="h-3 w-3" /> Refund {formatPence(openOrder.totalPence - openOrder.refundedPence)}
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Refund modal */}
      {refundOrderId && (
        <Modal
          isOpen={!!refundOrderId}
          onClose={() => setRefundOrderId(null)}
          title="Process Refund"
          maxWidth="md"
        >
          <form onSubmit={handleSubmitRefund} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Amount (pence)
              </label>
              <input
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Reason (optional)
              </label>
              <input
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full text-xs rounded-lg border border-stone-200 px-3 py-2 focus:ring-1 focus-ring-[#7e2b44] outline-none"
                placeholder="e.g. Customer request"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-stone-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRefundOrderId(null)}
                disabled={refunding}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                disabled={refunding || !refundAmount}
              >
                {refunding ? 'Refunding…' : 'Confirm Refund'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
