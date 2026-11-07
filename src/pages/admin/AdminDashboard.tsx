/**
 * AdminDashboard – live stats computed server-side via `getDashboardStats`.
 *
 * Shows today's orders, upcoming delivery dates with counts, revenue for 7
 * and 30 days, and a low-stock list. Staff or admin only.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  AlertCircle,
  Truck,
  Calendar,
  Loader2,
  RefreshCw,
  ServerCrash,
} from 'lucide-react';
import { formatPence } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../context/ToastContext';
import { ordersApi } from '../../lib/orders';
import { describeCallableError } from '../../lib/callableError';

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

export const AdminDashboard: React.FC = () => {
  const { error: showError } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const response = await ordersApi.getDashboardStats({});
        setStats(response.data);
      } catch (err) {
        const message = describeCallableError(err, 'Unable to load dashboard stats.');
        setError(message);
        showError('Stats failed', message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showError],
  );

  useEffect(() => {
    void loadStats('initial');
  }, [loadStats]);

  if (loading && !stats) {
    return (
      <div className="py-20 text-center text-stone-500 text-xs">
        <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
        Loading dashboard…
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-4 text-left">
        <h2 className="font-serif text-2xl font-bold text-stone-900">Admin Dashboard</h2>
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900"
        >
          <div className="flex items-start gap-3">
            <ServerCrash className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-semibold text-sm">Stats could not be loaded</p>
              <p className="text-xs leading-relaxed">{error}</p>
            </div>
          </div>
          <div className="mt-4 pl-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadStats('initial')}
              disabled={refreshing}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              {refreshing ? 'Retrying…' : 'Try again'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const s = stats as any;
  const today = s?.today ?? { orderCount: 0, revenuePence: 0, orders: [] };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-stone-900">Admin Dashboard</h2>
          <p className="text-xs text-stone-500 mt-1">
            Live figures computed from your Firestore data. Admins and staff only.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadStats('refresh')}
          disabled={refreshing}
          leftIcon={<RefreshCw className="h-4 w-4" />}
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900"
        >
          Refresh failed: {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">
                Today's Orders
              </p>
              <p className="font-serif text-2xl font-bold text-stone-900">
                {today.orderCount}
              </p>
            </div>
            <Truck className="h-6 w-6 text-[#7e2b44]" />
          </div>
          <p className="text-xs text-stone-500 mt-3">
            {formatPence(today.revenuePence)} revenue today
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">
                Revenue 7 Days
              </p>
              <p className="font-serif text-2xl font-bold text-stone-900">
                {formatPence(s?.revenue7dPence ?? 0)}
              </p>
            </div>
            <TrendingUp className="h-6 w-6 text-[#cb932b]" />
          </div>
          <p className="text-xs text-stone-500 mt-3">
            {formatPence(s?.revenue30dPence ?? 0)} last 30 days
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">
                Upcoming Delivery Dates
              </p>
              <p className="font-serif text-2xl font-bold text-stone-900">
                {s?.upcomingDeliveryDates?.length ?? 0}
              </p>
            </div>
            <Calendar className="h-6 w-6 text-[#7e2b44]" />
          </div>
          <p className="text-xs text-stone-500 mt-3">
            {s?.upcomingDeliveryDates?.slice(0, 3)
              ?.map((d: any) => d.date)
              .join(', ') || 'None scheduled'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">
                Low Stock Variants
              </p>
              <p className="font-serif text-2xl font-bold text-stone-900">
                {s?.lowStock?.length ?? 0}
              </p>
            </div>
            <AlertCircle className="h-6 w-6 text-[#c93c3c]" />
          </div>
          <p className="text-xs text-stone-500 mt-3">
            Threshold: {s?.lowStockThreshold ?? 5} units
          </p>
        </div>
      </div>

      {/* Today's orders */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <h3 className="font-serif text-base font-bold text-stone-900">
            Today's Orders
          </h3>
          <Button variant="outline" size="sm">View all orders</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-5">Order</th>
                <th className="py-3 px-5">Customer</th>
                <th className="py-3 px-5">Area</th>
                <th className="py-3 px-5">Total</th>
                <th className="py-3 px-5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {today.orders?.slice(0, 8).map((o: any) => (
                <tr key={o.orderNumber} className="hover:bg-stone-50">
                  <td className="py-3 px-5 font-mono font-bold text-stone-900">
                    {o.orderNumber}
                  </td>
                  <td className="py-3 px-5">{o.customer}</td>
                  <td className="py-3 px-5 text-[10px] text-stone-500">
                    {o.area || '—'}
                  </td>
                  <td className="py-3 px-5 font-medium">{formatPence(o.totalPence)}</td>
                  <td className="py-3 px-5">
                    <Badge variant="gold" size="sm">
                      {STATUS_LABELS[o.status] ?? o.status}
                    </Badge>
                  </td>
                </tr>
              ))}
              {today.orders?.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-stone-400 text-xs">
                    No orders today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upcoming delivery dates */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs">
        <div className="p-5 border-b border-stone-100">
          <h3 className="font-serif text-base font-bold text-stone-900">
            Upcoming Delivery Dates
          </h3>
        </div>
        <div className="space-y-2">
          {s?.upcomingDeliveryDates?.map((d: any) => (
            <div key={d.date} className="p-4 border-b border-stone-50 flex justify-between items-center">
              <div>
                <p className="font-medium text-stone-900">{d.date}</p>
                <p className="text-xs text-stone-500">{d.count} order{d.count !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex gap-1">
                {d.areas?.map((a: any) => (
                  <Badge key={a.area} variant="neutral" size="sm">
                    {a.count}× {a.area}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
          {s?.upcomingDeliveryDates?.length === 0 && (
            <div className="p-8 text-center text-stone-400 text-xs">
              No upcoming delivery dates.
            </div>
          )}
        </div>
      </div>

      {/* Low stock */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs">
        <div className="p-5 border-b border-stone-100">
          <h3 className="font-serif text-base font-bold text-stone-900">
            Low Stock Variants
          </h3>
          <p className="text-[10px] text-stone-500 mt-1">
            Variants at or below {s?.lowStockThreshold ?? 5} units.
          </p>
        </div>
        <div className="space-y-2">
          {s?.lowStock?.map((item: any) => (
            <div key={`${item.productId}-${item.variantId}`} className="p-4 border-b border-stone-50 flex justify-between items-center">
              <div>
                <p className="font-medium text-stone-900">{item.productName}</p>
                <p className="text-xs text-stone-500">
                  {item.variantName} • {item.stock} left
                </p>
              </div>
              <Badge variant="danger" size="sm">
                Low Stock
              </Badge>
            </div>
          ))}
          {s?.lowStock?.length === 0 && (
            <div className="p-8 text-center text-stone-400 text-xs">
              All variants above threshold.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
