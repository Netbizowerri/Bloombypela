import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  CalendarDays,
  Truck,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  Shield,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

export const AdminSidebar: React.FC<{ onCloseMobile?: () => void }> = ({ onCloseMobile }) => {
  const { user } = useAuth();

  const navItems = [
    { label: 'Overview', to: '/admin', icon: LayoutDashboard, end: true },
    { label: 'Catalogue & Products', to: '/admin/catalogue', icon: Package },
    { label: 'Orders & Fulfilment', to: '/admin/orders', icon: ShoppingBag },
    { label: 'Weekly Subscriptions', to: '/admin/subscriptions', icon: RotateCcw },
    { label: 'Delivery & Schedules', to: '/admin/delivery', icon: Truck },
    { label: 'Juice Batch Capacity', to: '/admin/capacity', icon: CalendarDays },
    { label: 'Promotions & Codes', to: '/admin/promotions', icon: Sparkles },
    { label: 'Audit Trail', to: '/admin/audit', icon: Layers },
  ];

  return (
    <aside className="w-64 bg-[#0a3318] text-white flex flex-col h-full border-r border-[#155d2c]">
      {/* Brand Header with Logo (Only Logo, 600x150, text removed) */}
      <div className="p-4 border-b border-[#155d2c]/60 flex items-center justify-between">
        <Link to="/admin" className="block group">
          <img
            src="https://res.cloudinary.com/titznrnk/image/upload/f_auto,q_auto/Bloom_By_Pela_Nourish_Naturally"
            alt="Bloom by Pela"
            className="h-[52px] w-auto max-w-[230px] object-contain group-hover:opacity-90 transition-opacity"
            width={600}
            height={150}
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto text-left">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
          Management
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onCloseMobile}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors',
                isActive
                  ? 'bg-[#155d2c] text-white font-semibold shadow-xs ring-1 ring-[#deb252]/40'
                  : 'text-stone-300 hover:bg-[#104923]/60 hover:text-white'
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0 text-[#deb252]" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User profile & Storefront return */}
      <div className="p-4 border-t border-[#155d2c]/60 bg-[#072411] space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-[#155d2c] border border-[#deb252] flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user?.name?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="text-xs font-semibold truncate text-white">{user?.name || 'Administrator'}</p>
            <div className="flex items-center gap-1 text-[10px] text-emerald-400">
              <Shield className="h-3 w-3" />
              <span className="capitalize">{user?.role || 'admin'} Portal</span>
            </div>
          </div>
        </div>

        <Link
          to="/"
          className="flex items-center justify-center gap-2 w-full py-2 px-3 text-xs font-medium text-stone-200 hover:text-white bg-[#104923]/60 hover:bg-[#155d2c] rounded-md transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Storefront</span>
        </Link>
      </div>
    </aside>
  );
};
