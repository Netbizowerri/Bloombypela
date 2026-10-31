/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { CartProvider } from './context/CartContext';

// Layouts & Guards
import { ScrollToTop } from './components/common/ScrollToTop';
import { PublicLayout } from './components/layout/PublicLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { PageLoader } from './components/ui/PageLoader';

// Public Pages (eager: small, above-the-fold or footer-linked)
import { HomePage } from './pages/Home';
import { AboutPage } from './pages/AboutPage';
import { DeliveryInfoPage } from './pages/DeliveryInfoPage';
import { AllergensPage } from './pages/AllergensPage';
import { ContactPage } from './pages/ContactPage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AccessDeniedPage } from './pages/AccessDeniedPage';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';

// Heavy public routes (lazy: own chunks)
const ShopPage = lazy(() =>
  import('./pages/ShopPage').then((module) => ({ default: module.ShopPage }))
);
const ShopSnacksPage = lazy(() =>
  import('./pages/ShopSnacks').then((module) => ({ default: module.ShopSnacksPage }))
);
const ShopJuicesPage = lazy(() =>
  import('./pages/ShopJuices').then((module) => ({ default: module.ShopJuicesPage }))
);
const ProductDetailPage = lazy(() =>
  import('./pages/ProductDetailPage').then((module) => ({ default: module.ProductDetailPage }))
);
const SubscriptionsPage = lazy(() =>
  import('./pages/SubscriptionsPage').then((module) => ({ default: module.SubscriptionsPage }))
);
const AccountPage = lazy(() =>
  import('./pages/AccountPage').then((module) => ({ default: module.AccountPage }))
);
const CheckoutPage = lazy(() =>
  import('./pages/CheckoutPage').then((module) => ({ default: module.CheckoutPage }))
);

// Admin Pages (lazy: separate admin chunks)
const AdminDashboard = lazy(() =>
  import('./pages/admin/AdminDashboard').then((module) => ({ default: module.AdminDashboard }))
);
const AdminCatalogue = lazy(() =>
  import('./pages/admin/AdminCatalogue').then((module) => ({ default: module.AdminCatalogue }))
);
const AdminOrders = lazy(() =>
  import('./pages/admin/AdminOrders').then((module) => ({ default: module.AdminOrders }))
);
const AdminSubscriptions = lazy(() =>
  import('./pages/admin/AdminSubscriptions').then((module) => ({ default: module.AdminSubscriptions }))
);
const AdminDeliverySettings = lazy(() =>
  import('./pages/admin/AdminDeliverySettings').then((module) => ({
    default: module.AdminDeliverySettings,
  }))
);
const AdminCapacity = lazy(() =>
  import('./pages/admin/AdminCapacity').then((module) => ({ default: module.AdminCapacity }))
);
const AdminPromotions = lazy(() =>
  import('./pages/admin/AdminPromotions').then((module) => ({ default: module.AdminPromotions }))
);

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <ToastProvider>
          <CartProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public Storefront Routes */}
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/shop" element={<ShopPage />} />
                  <Route path="/shop/snacks" element={<ShopSnacksPage />} />
                  <Route path="/shop/juices" element={<ShopJuicesPage />} />
                  <Route path="/product/:slug" element={<ProductDetailPage />} />
                  <Route path="/subscriptions" element={<SubscriptionsPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/delivery" element={<DeliveryInfoPage />} />
                  <Route path="/allergens" element={<AllergensPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />

                  {/* Authentication Routes */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/access-denied" element={<AccessDeniedPage />} />

                  {/* Customer Account (Protected) */}
                  <Route
                    path="/account"
                    element={
                      <ProtectedRoute allowedRoles={['customer', 'staff', 'admin']}>
                        <AccountPage />
                      </ProtectedRoute>
                    }
                  />
                </Route>

                {/* Admin Portal (Protected: Role = 'admin' or 'staff') */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'staff']}>
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<AdminDashboard />} />
                  <Route path="catalogue" element={<AdminCatalogue />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="subscriptions" element={<AdminSubscriptions />} />
                  <Route path="delivery" element={<AdminDeliverySettings />} />
                  <Route path="capacity" element={<AdminCapacity />} />
                  <Route path="promotions" element={<AdminPromotions />} />
                  <Route path="audit" element={<AdminDashboard />} />
                </Route>

                {/* 404 Catch-All */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </CartProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
