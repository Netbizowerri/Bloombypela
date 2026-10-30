import React from 'react';
import {
  ShoppingBag,
  TrendingUp,
  RotateCcw,
  AlertCircle,
  Truck,
  ArrowRight,
  Package,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { formatPence } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Link } from 'react-router-dom';

export const AdminDashboard: React.FC = () => {
  const kpis = [
    {
      title: 'Upcoming Thursday Delivery',
      value: '28 Orders',
      subtext: 'Next batch: 30 Oct 2026',
      icon: Truck,
      color: 'text-[#7e2b44]',
      bg: 'bg-[#fbf4f5]',
    },
    {
      title: 'Active Weekly Subscribers',
      value: '42 Subscribers',
      subtext: '£680.00 / week recurring MRR',
      icon: RotateCcw,
      color: 'text-[#cb932b]',
      bg: 'bg-[#fbf8ed]',
    },
    {
      title: 'This Week Juice Capacity',
      value: '185 / 250 Units',
      subtext: '74% capacity reserved',
      icon: Calendar,
      color: 'text-[#245840]',
      bg: 'bg-[#f3f8f5]',
    },
    {
      title: 'Low Stock Alert',
      value: '1 Product Low',
      subtext: 'Toasted Coconut Chips (15 left)',
      icon: AlertCircle,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
    },
  ];

  const recentOrders = [
    {
      id: 'BBP-ORD-8923',
      customer: 'Eleanor Vance',
      area: 'NE2 (Jesmond)',
      items: 'Weekly Bloom 5 + Plantain Chips',
      totalPence: 2300,
      status: 'Preparing',
    },
    {
      id: 'BBP-ORD-8922',
      customer: 'David Taylor',
      area: 'NE1 (City Centre)',
      items: 'Tropical Bloom (330ml) x 3',
      totalPence: 1350,
      status: 'Preparing',
    },
    {
      id: 'BBP-ORD-8921',
      customer: 'Sarah Jenkins',
      area: 'NE3 (Gosforth)',
      items: 'Tasting Box + Ginger Shots (6-pk)',
      totalPence: 3550,
      status: 'Out for delivery',
    },
  ];

  return (
    <div className="space-y-8 text-left">
      {/* Top Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-stone-900">Operations Dashboard</h2>
          <p className="text-xs text-stone-500 mt-1">
            Real-time fulfillment, subscription rosters, and juice capacity tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/admin/orders">
            <Button variant="primary" size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
              View Packing Slips
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                {kpi.title}
              </span>
              <div className={`p-2 rounded-xl ${kpi.bg} ${kpi.color}`}>
                <kpi.icon className="h-5 w-5" />
              </div>
            </div>
            <div>
              <div className="font-serif text-2xl font-bold text-stone-900">{kpi.value}</div>
              <p className="text-xs text-stone-500 mt-1">{kpi.subtext}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Orders & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-serif text-base font-bold text-stone-900">
              Upcoming Thursday Delivery Batch
            </h3>
            <Link to="/admin/orders" className="text-xs font-semibold text-[#7e2b44] hover:underline">
              View All Orders →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-3 px-5">Order #</th>
                  <th className="py-3 px-5">Customer</th>
                  <th className="py-3 px-5">Outward Area</th>
                  <th className="py-3 px-5">Items Summary</th>
                  <th className="py-3 px-5">Total</th>
                  <th className="py-3 px-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {recentOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-stone-50">
                    <td className="py-3 px-5 font-bold text-[#7e2b44]">{ord.id}</td>
                    <td className="py-3 px-5 font-medium">{ord.customer}</td>
                    <td className="py-3 px-5 font-semibold text-[#cb932b]">{ord.area}</td>
                    <td className="py-3 px-5 truncate max-w-xs">{ord.items}</td>
                    <td className="py-3 px-5 font-bold">{formatPence(ord.totalPence)}</td>
                    <td className="py-3 px-5">
                      <Badge variant={ord.status === 'Preparing' ? 'gold' : 'green'} size="sm">
                        {ord.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Operations Actions */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
            <h3 className="font-serif text-base font-bold text-stone-900">Operations Fast Links</h3>
            <div className="space-y-2">
              <Link
                to="/admin/catalogue"
                className="flex items-center justify-between p-3 rounded-xl border border-stone-100 hover:border-[#7e2b44] bg-stone-50 hover:bg-[#fbf4f5] transition-all text-xs font-semibold text-stone-800"
              >
                <div className="flex items-center gap-2.5">
                  <Package className="h-4 w-4 text-[#7e2b44]" />
                  <span>Update Products & Stock</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-stone-400" />
              </Link>

              <Link
                to="/admin/capacity"
                className="flex items-center justify-between p-3 rounded-xl border border-stone-100 hover:border-[#245840] bg-stone-50 hover:bg-[#e2f0e6] transition-all text-xs font-semibold text-stone-800"
              >
                <div className="flex items-center gap-2.5">
                  <Calendar className="h-4 w-4 text-[#245840]" />
                  <span>Manage Batch Capacity</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-stone-400" />
              </Link>

              <Link
                to="/admin/delivery"
                className="flex items-center justify-between p-3 rounded-xl border border-stone-100 hover:border-[#cb932b] bg-stone-50 hover:bg-[#faf1de] transition-all text-xs font-semibold text-stone-800"
              >
                <div className="flex items-center gap-2.5">
                  <Truck className="h-4 w-4 text-[#cb932b]" />
                  <span>Delivery Postcode Rules</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-stone-400" />
              </Link>
            </div>
          </div>

          <div className="bg-[#2f0b16] text-white rounded-2xl p-5 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-gold-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="h-4 w-4" />
              <span>Owner Notice</span>
            </div>
            <p className="text-xs text-stone-300 leading-relaxed">
              Cut-off for this week's Thursday deliveries: <strong>Monday at 12:00 PM London</strong>. Orders placed after cut-off move automatically to the next week.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
