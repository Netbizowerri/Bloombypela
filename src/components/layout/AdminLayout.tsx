import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { ToastContainer } from '../ui/Toast';
import { Menu, Shield, ExternalLink, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRole } from '../../hooks/useRole';
import { UserRole } from '../../types/auth';

export const AdminLayout: React.FC = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const { user, setDevRole } = useAuth();
  const { role } = useRole();
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/admin') return 'Dashboard Overview';
    if (path.includes('/catalogue')) return 'Catalogue Management';
    if (path.includes('/orders')) return 'Orders & Packing Slips';
    if (path.includes('/subscriptions')) return 'Weekly Subscriptions';
    if (path.includes('/delivery')) return 'Delivery Areas & Cut-offs';
    if (path.includes('/capacity')) return 'Juice Batch Capacity';
    if (path.includes('/promotions')) return 'Promotions & Promo Codes';
    if (path.includes('/audit')) return 'Security Audit Trail';
    return 'Admin';
  };

  return (
    <div className="min-h-screen flex bg-stone-100 text-stone-900">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block lg:w-64 shrink-0">
        <div className="fixed inset-y-0 w-64">
          <AdminSidebar />
        </div>
      </div>

      {/* Mobile Sidebar Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 shadow-2xl">
            <AdminSidebar onCloseMobile={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Admin Top Navigation */}
        <header className="sticky top-0 z-30 bg-white border-b border-stone-200 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-stone-500 hover:text-stone-900 hover:bg-stone-100"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-serif text-lg font-bold text-stone-900">{getPageTitle()}</h1>
              <p className="text-[11px] text-stone-500 hidden sm:block">
                Bloom by Pela Operations • Newcastle upon Tyne
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Role Tester in Admin Header */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-700 transition-colors"
                title="Test Role Simulation"
              >
                <Shield className="h-3.5 w-3.5 text-[#155d2c]" />
                <span className="capitalize">Role: {role}</span>
                <ChevronDown className="h-3 w-3 text-stone-400" />
              </button>

              {roleMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white shadow-xl border border-stone-200 py-1.5 z-50 text-left">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Switch Test Role:
                  </div>
                  {(['admin', 'staff', 'customer', 'guest'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        setDevRole(r);
                        setRoleMenuOpen(false);
                      }}
                      className={`w-full px-3 py-1.5 text-xs text-left capitalize flex items-center justify-between hover:bg-stone-100 ${
                        role === r ? 'font-bold text-[#155d2c] bg-[#f0f7f2]' : 'text-stone-700'
                      }`}
                    >
                      <span>{r}</span>
                      {role === r && <span className="text-[10px] bg-[#155d2c] text-white px-1.5 py-0.2 rounded">Active</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link
              to="/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">View Store</span>
            </Link>

            <div className="h-8 w-8 rounded-full bg-[#155d2c] border border-[#deb252] text-white flex items-center justify-center font-bold text-xs">
              {user?.name?.charAt(0).toUpperCase() || 'P'}
            </div>
          </div>
        </header>

        {/* Admin Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      <ToastContainer />
    </div>
  );
};
