/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { CartProvider } from './context/CartContext';

// Layouts & Guards
import { ScrollToTop } from './components/common/ScrollToTop';
import { PublicLayout } from './components/layout/PublicLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Public Pages
import { HomePage } from './pages/Home';
import { ShopPage } from './pages/ShopPage';
import { ShopSnacksPage } from './pages/ShopSnacks';
import { ShopJuicesPage } from './pages/ShopJuices';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { SubscriptionsPage } from './pages/SubscriptionsPage';
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
import { AccountPage } from './pages/AccountPage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminCatalogue } from './pages/admin/AdminCatalogue';
import { AdminOrders } from './pages/admin/AdminOrders';
import { AdminSubscriptions } from './pages/admin/AdminSubscriptions';
import { AdminDeliverySettings } from './pages/admin/AdminDeliverySettings';
import { AdminCapacity } from './pages/admin/AdminCapacity';

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <ToastProvider>
          <CartProvider>
            <Routes>
              {/* Public Storefront Routes */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/shop" element={<ShopPage />} />
                <Route path="/shop/snacks" element={<ShopSnacksPage />} />
                <Route path="/shop/juices" element={<ShopJuicesPage />} />
                <Route path="/product/:slug" element={<ProductDetailPage />} />
                <Route path="/subscriptions" element={<SubscriptionsPage />} />
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
                <Route path="promotions" element={<AdminCatalogue />} />
                <Route path="audit" element={<AdminDashboard />} />
              </Route>

              {/* 404 Catch-All */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </CartProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
