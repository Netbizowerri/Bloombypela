import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, User, Menu, X, Shield, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRole } from '../../hooks/useRole';
import { useCart } from '../../context/CartContext';
import { UserRole } from '../../types/auth';

export const PublicHeader: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const { user, signOut, setDevRole } = useAuth();
  const { role, isStaff } = useRole();
  const { totalItems, openCart } = useCart();
  const location = useLocation();

  const navLinks = [
    { label: 'Shop', path: '/shop' },
    { label: 'Snacks', path: '/shop/snacks' },
    { label: 'Fresh Juices', path: '/shop/juices' },
    { label: 'Subscriptions', path: '/subscriptions' },
    { label: 'Delivery', path: '/delivery' },
    { label: 'Our Story', path: '/about' },
  ];

  const handleRoleChange = (newRole: UserRole) => {
    setDevRole(newRole);
    setRoleMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#FFF5E6] border-b border-[#eedcc8] px-4 sm:px-6 lg:px-8 py-2.5 transition-all shadow-xs">
      {/* Header Container with #FFF5E6 background */}
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Brand Logo (Updated URL, Increased by 40%, 600x150 aspect) */}
        <div className="flex items-center">
          <Link to="/" className="flex items-center group py-0.5">
            <img
              src="https://res.cloudinary.com/titznrnk/image/upload/f_auto,q_auto/Bloom_By_Pela_Nourish_Naturally"
              alt="Bloom by Pela"
              className="h-[48px] sm:h-[62px] w-auto max-w-[240px] sm:max-w-[280px] object-contain group-hover:opacity-90 transition-opacity"
              width={600}
              height={150}
            />
          </Link>
        </div>

        {/* Center: Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 lg:gap-9">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`text-xs font-semibold tracking-wide transition-all relative py-1.5 ${
                  isActive
                    ? 'text-[#155d2c] font-bold'
                    : 'text-stone-700 hover:text-[#155d2c]'
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-[#e57b32] rounded-full shadow-xs" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Controls: User Profile with Avatar & Name, Role Switcher, Basket */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Admin link badge if staff or admin */}
          {isStaff && (
            <Link
              to="/admin"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold rounded-full bg-[#155d2c] text-white hover:bg-[#104923] transition-colors shadow-xs"
            >
              <Shield className="h-3 w-3 text-gold-300" />
              <span>Admin</span>
            </Link>
          )}

          {/* User Profile Pill Avatar & Name */}
          {user ? (
            <Link
              to="/account"
              className="flex items-center gap-2 hover:bg-stone-200/50 p-1 pr-2.5 rounded-full transition-colors"
              title={`Logged in as ${user.name}`}
            >
              <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-[#deb252] to-[#e57b32] p-0.5 shadow-xs">
                <div className="h-full w-full rounded-full bg-white flex items-center justify-center font-bold text-[11px] text-stone-900">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              </div>
              <span className="text-xs font-semibold text-stone-800 hidden sm:inline max-w-[85px] truncate">
                {user.name.split(' ')[0]}
              </span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="text-xs font-semibold text-stone-700 hover:text-[#155d2c] px-2.5 py-1 transition-colors hidden sm:inline-block"
            >
              Sign In
            </Link>
          )}

          {/* Quick Role Tester Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-full bg-white/80 hover:bg-white text-stone-700 border border-stone-300/80 shadow-2xs transition-colors"
              title="Switch role for testing"
            >
              <span className="capitalize">{role}</span>
              <ChevronDown className="h-3 w-3 text-stone-500" />
            </button>

            {roleMenuOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-xl bg-white shadow-xl border border-stone-200 py-1.5 z-50 text-left text-xs">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Switch Preview Role:
                </div>
                {(['admin', 'staff', 'customer', 'guest'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRoleChange(r)}
                    className={`w-full px-3 py-1.5 text-left capitalize flex items-center justify-between hover:bg-stone-50 ${
                      role === r ? 'font-bold text-[#155d2c] bg-emerald-50/60' : 'text-stone-700'
                    }`}
                  >
                    <span>{r}</span>
                    {role === r && (
                      <span className="text-[10px] bg-[#155d2c] text-white px-1.5 py-0.2 rounded">
                        Active
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Shopping Basket Button with 44px touch-target & tactile feedback */}
          <button
            type="button"
            onClick={openCart}
            className="relative h-10 w-10 sm:h-11 sm:w-11 flex items-center justify-center rounded-full bg-white/80 hover:bg-white text-stone-800 hover:text-[#155d2c] border border-stone-300/80 shadow-2xs active:scale-95 transition-all cursor-pointer"
            aria-label={`Shopping Basket with ${totalItems} items`}
          >
            <ShoppingBag className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-[#155d2c] text-white text-[10px] font-bold shadow-xs border-2 border-[#FFF5E6]">
                {totalItems}
              </span>
            )}
          </button>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg text-stone-800 hover:bg-stone-200/50"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden max-w-7xl mx-auto mt-2 bg-[#FFF5E6] rounded-2xl border border-[#eedcc8] shadow-xl p-4 space-y-2 text-left">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-stone-800 hover:text-[#155d2c] hover:bg-stone-200/40"
            >
              {link.label}
            </Link>
          ))}

          <div className="border-t border-[#eedcc8] pt-3 flex justify-between items-center text-xs text-stone-600 px-3">
            {user ? (
              <>
                <Link
                  to="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className="font-semibold text-stone-900"
                >
                  My Account ({user.name})
                </Link>
                <button onClick={signOut} className="text-red-600 font-semibold">
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex gap-4">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-[#155d2c] font-bold"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
