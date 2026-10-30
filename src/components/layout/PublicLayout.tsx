import React from 'react';
import { Outlet } from 'react-router-dom';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';
import { MobileStickyFooter } from './MobileStickyFooter';
import { CartDrawer } from '../cart/CartDrawer';
import { ToastContainer } from '../ui/Toast';

export const PublicLayout: React.FC = () => {
  return (
    <div className="relative min-h-screen flex flex-col bg-[#FDFBF7] selection:bg-[#cb932b]/20 selection:text-[#4e1828]">
      {/* Sitewide Food Delivery Pattern Overlay at 7% Opacity */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.07] food-delivery-pattern bg-repeat"
        style={{ opacity: 0.07 }}
        aria-hidden="true"
      />

      {/* Main Page Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <PublicHeader />
        <main className="flex-1 pb-20 md:pb-0">
          <Outlet />
        </main>
        <PublicFooter />
        <MobileStickyFooter />
        <CartDrawer />
        <ToastContainer />
      </div>
    </div>
  );
};

