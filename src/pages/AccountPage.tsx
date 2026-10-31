import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../hooks/useRole';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatPence } from '../lib/utils';
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
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AccountPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const { role, isStaff } = useRole();
  const { success, info } = useToast();
  const [activeTab, setActiveTab] = useState<'orders' | 'subscriptions' | 'addresses' | 'privacy'>('orders');

  // Simulated subscription state
  const [subPaused, setSubPaused] = useState(false);
  const [subSkipped, setSubSkipped] = useState(false);

  // Mock orders for demo
  const mockOrders = [
    {
      id: 'BBP-ORD-8921',
      date: '2026-10-23',
      deliveryDate: '2026-10-29',
      items: [
        { name: 'Tropical Bloom (330ml)', quantity: 2, pricePence: 900 },
        { name: 'Plantain chips (150g)', quantity: 2, pricePence: 700 },
      ],
      totalPence: 1600,
      status: 'Delivered',
      fulfilment: 'Local Thursday Delivery (NE2)',
    },
  ];

  const handleSkipNext = () => {
    setSubSkipped(!subSkipped);
    if (!subSkipped) {
      success('Delivery Skipped', 'Your upcoming Thursday delivery has been skipped. You will not be charged.');
    } else {
      success('Delivery Restored', 'Your upcoming delivery has been unskipped.');
    }
  };

  const handlePauseSub = () => {
    setSubPaused(!subPaused);
    if (!subPaused) {
      success('Subscription Paused', 'Paused for 2 weeks. Automatic resume scheduled.');
    } else {
      success('Subscription Resumed', 'Welcome back! Your weekly deliveries are active.');
    }
  };

  const handleGdprExport = () => {
    info('Data Export Initiated', 'A complete copy of your personal data and order records will be emailed to ' + user?.email);
  };

  const handleGdprDelete = () => {
    if (confirm('Are you sure you wish to submit a UK GDPR Right-to-be-Forgotten erasure request?')) {
      info('Erasure Request Logged', 'Our Data Protection officer has received your request. Personal data will be erased within 30 days.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 text-left">
      {/* Top Profile Header */}
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

      {/* Tabs */}
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

      {/* Tab 1: Orders */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-stone-900">Recent Orders</h3>
            <span className="text-xs text-stone-500">{mockOrders.length} order recorded</span>
          </div>

          {mockOrders.map((ord) => (
            <div
              key={ord.id}
              className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-4 gap-2">
                <div>
                  <span className="text-xs font-bold text-[#7e2b44]">{ord.id}</span>
                  <p className="text-xs text-stone-500">Placed on {ord.date} • {ord.fulfilment}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="green">{ord.status}</Badge>
                  <span className="font-serif text-lg font-bold text-stone-900">
                    {formatPence(ord.totalPence)}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-stone-700">
                {ord.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1">
                    <span>
                      {item.quantity} × {item.name}
                    </span>
                    <span className="font-medium text-stone-900">{formatPence(item.pricePence)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => success('Reordered', 'Items added to your current basket.')}
                >
                  Reorder Items
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Subscriptions */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-xl font-bold text-stone-900">Weekly Bloom 5</h3>
                  <Badge variant={subPaused ? 'gold' : subSkipped ? 'neutral' : 'green'}>
                    {subPaused ? 'Paused' : subSkipped ? 'Next Delivery Skipped' : 'Active'}
                  </Badge>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  5 Bottles weekly • £19.50 / week • Delivered Thursdays to Newcastle upon Tyne
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-stone-400 uppercase tracking-wider block">Next Billing</span>
                <span className="text-xs font-semibold text-stone-800">Monday 12:00 PM London</span>
              </div>
            </div>

            {/* Next delivery info */}
            <div className="bg-[#fbf8ed] p-4 rounded-xl border border-[#f4e1ba] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-[#cb932b] shrink-0" />
                <div className="text-xs text-[#73451c]">
                  <p className="font-bold">Next Delivery: Thursday</p>
                  <p className="text-[11px] text-stone-600">
                    Cut-off for changes: Monday 12:00 PM London time.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSkipNext}
                  className="text-xs"
                >
                  {subSkipped ? 'Unskip Delivery' : 'Skip Next Delivery'}
                </Button>
                <Button
                  variant={subPaused ? 'primary' : 'outline'}
                  size="sm"
                  onClick={handlePauseSub}
                  className="text-xs"
                >
                  {subPaused ? 'Resume Subscription' : 'Pause (1–8 Wks)'}
                </Button>
              </div>
            </div>

            {/* Flavour selections */}
            <div className="space-y-2 text-xs">
              <span className="font-bold uppercase tracking-wider text-stone-500 block">
                Current Flavour Selections:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-stone-700">
                <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                  2 × Tropical Bloom (330ml)
                </div>
                <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                  1 × Skin Glow/Skin Flow — final product name to be confirmed (330ml)
                </div>
                <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                  1 × Zobo (330ml)
                </div>
                <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                  1 × Detox juice blend (330ml)
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
              <Link to="/subscriptions" className="font-semibold text-[#7e2b44] hover:underline">
                Change Flavours for Next Week →
              </Link>
              <button
                type="button"
                onClick={() => info('Stripe Customer Portal', 'In live mode, opens Stripe hosted billing portal to manage payment method.')}
                className="hover:underline text-stone-700"
              >
                Update Payment Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Addresses */}
      {activeTab === 'addresses' && (
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
            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={() => info('Address Editor', 'Address management form.')}>
                Edit Address
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: UK GDPR Privacy & Data Rights */}
      {activeTab === 'privacy' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-6">
          <div>
            <h3 className="font-serif text-xl font-bold text-stone-900">
              Your Data Privacy Rights (UK GDPR)
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Bloom by Pela values your data sovereignty. You can export or request erasure of your account data at any time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border border-stone-200 bg-stone-50 space-y-3">
              <Download className="h-6 w-6 text-[#7e2b44]" />
              <h4 className="font-serif text-base font-bold text-stone-900">Right to Portability</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Download a machine-readable JSON copy of all orders, profile addresses, and subscription logs.
              </p>
              <Button variant="outline" size="sm" onClick={handleGdprExport}>
                Request Data Export
              </Button>
            </div>

            <div className="p-5 rounded-xl border border-red-200 bg-red-50/50 space-y-3">
              <Trash2 className="h-6 w-6 text-red-600" />
              <h4 className="font-serif text-base font-bold text-stone-900">Right to Erasure</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Request permanent deletion of your customer record and contact details in accordance with UK GDPR.
              </p>
              <Button variant="danger" size="sm" onClick={handleGdprDelete}>
                Request Account Erasure
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
