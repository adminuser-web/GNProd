/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './components/HomePage';

const CollectionPage = lazy(() => import('./components/CollectionPage').then(m => ({ default: m.CollectionPage })));
const ProductPage = lazy(() => import('./components/ProductPage').then(m => ({ default: m.ProductPage })));
const OrderPage = lazy(() => import('./components/OrderPage').then(m => ({ default: m.OrderPage })));
const OrderConfirmationPage = lazy(() => import('./components/OrderConfirmationPage').then(m => ({ default: m.OrderConfirmationPage })));
const PhilosophyPage = lazy(() => import('./components/PhilosophyPage').then(m => ({ default: m.PhilosophyPage })));
const ContactPage = lazy(() => import('./components/ContactPage').then(m => ({ default: m.ContactPage })));
const BatCarePage = lazy(() => import('./components/LegalPages').then(m => ({ default: m.BatCarePage })));
const ShippingPage = lazy(() => import('./components/LegalPages').then(m => ({ default: m.ShippingPage })));
const RefundPage = lazy(() => import('./components/LegalPages').then(m => ({ default: m.RefundPage })));
const PrivacyPage = lazy(() => import('./components/LegalPages').then(m => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('./components/LegalPages').then(m => ({ default: m.TermsPage })));
const NotFoundPage = lazy(() => import('./components/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const AuthPage = lazy(() => import('./components/AuthPage').then(m => ({ default: m.AuthPage })));
const MyOrdersPage = lazy(() => import('./components/MyOrdersPage').then(m => ({ default: m.MyOrdersPage })));
const MyBuildsPage = lazy(() => import('./components/MyBuildsPage').then(m => ({ default: m.MyBuildsPage })));
const OrderDetailPage = lazy(() => import('./components/OrderDetailPage').then(m => ({ default: m.OrderDetailPage })));
const ReceiptPage = lazy(() => import('./components/ReceiptPage').then(m => ({ default: m.ReceiptPage })));
const MyRequestsPage = lazy(() => import('./components/MyRequestsPage').then(m => ({ default: m.MyRequestsPage })));
const ProfileSetupPage = lazy(() => import('./components/ProfileSetupPage').then(m => ({ default: m.ProfileSetupPage })));
const SecurityPage = lazy(() => import('./components/SecurityPage').then(m => ({ default: m.SecurityPage })));
const BatConsultantPage = lazy(() => import('./components/BatConsultantPage').then(m => ({ default: m.BatConsultantPage })));
const ComparisonPage = lazy(() => import('./components/ComparisonPage').then(m => ({ default: m.ComparisonPage })));
const LocateUsPage = lazy(() => import('./components/LocateUsPage').then(m => ({ default: m.LocateUsPage })));
const TrackOrderPage = lazy(() => import('./components/TrackOrderPage').then(m => ({ default: m.TrackOrderPage })));

const AdminLayout = lazy(() => import('./components/admin/AdminLayout').then(m => ({ default: m.AdminLayout })));
const AdminPage = lazy(() => import('./components/AdminPage').then(m => ({ default: m.AdminPage })));
const AdminCustomersPage = lazy(() => import('./components/admin/AdminCustomersPage').then(m => ({ default: m.AdminCustomersPage })));
const AdminOrdersBoard = lazy(() => import('./components/admin/AdminOrdersBoard').then(m => ({ default: m.AdminOrdersBoard })));
const AdminOrderDetailsPage = lazy(() => import('./components/admin/AdminOrderDetailsPage').then(m => ({ default: m.AdminOrderDetailsPage })));
const AdminProductsPage = lazy(() => import('./components/AdminProductsPage').then(m => ({ default: m.AdminProductsPage })));
const AdminSeriesDetailPage = lazy(() => import('./components/admin/products/AdminSeriesDetailPage').then(m => ({ default: m.AdminSeriesDetailPage })));
const AdminProductEditorPage = lazy(() => import('./components/admin/products/AdminProductEditorPage').then(m => ({ default: m.AdminProductEditorPage })));
const AdminContentEditorPage = lazy(() => import('./components/admin/content/AdminContentEditorPage').then(m => ({ default: m.AdminContentEditorPage })));
const AdminSupportPage = lazy(() => import('./components/admin/AdminSupportPage').then(m => ({ default: m.AdminSupportPage })));
const AdminEnquiriesPage = lazy(() => import('./components/admin/AdminEnquiriesPage').then(m => ({ default: m.AdminEnquiriesPage })));
const AdminAuditPage = lazy(() => import('./components/admin/AdminAuditPage').then(m => ({ default: m.AdminAuditPage })));



import { OrderProvider } from './context/OrderContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProductsProvider } from './context/ProductsContext';
import { ContentProvider } from './context/ContentContext';
import { SiteMeta } from './components/SiteMeta';
import { MaintenanceGate } from './components/MaintenanceGate';
import { OrderDrawer } from './components/OrderDrawer';
import { FloatingWhatsApp } from './components/FloatingWhatsApp';
import { ScrollToTop } from './components/ScrollToTop';
import { PageTransition } from './components/PageTransition';
import { BackgroundGraphics } from './components/BackgroundGraphics';
import { Toaster } from 'sonner';

import { ErrorBoundary } from './components/ErrorBoundary';
import { FEATURES } from './config/features';

const SeriesOrProductRouter = lazy(() => import('./components/SeriesOrProductRouter').then(m => ({ default: m.SeriesOrProductRouter })));

// Customer-facing chrome (storefront nav, footer, cart drawer, WhatsApp bubble)
// must not render on /admin routes — the admin shell has its own header/sidebar,
// and the storefront nav otherwise overlaps it.
function HideOnAdmin({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return pathname.startsWith('/admin') ? null : <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ContentProvider>
          <OrderProvider>
            <AuthProvider>
              <ProductsProvider>
                <Router>
                  <SiteMeta />
                  <Toaster
                    position="bottom-right" 
                    style={{ zIndex: 'var(--z-toast)' }}
                    toastOptions={{
                      style: {
                        background: 'var(--color-bg)',
                        color: 'var(--color-content)',
                        border: '1px solid rgba(197, 160, 89, 0.2)',
                      },
                    }} 
                  />
                  <ScrollToTop />
                <BackgroundGraphics />
                <MaintenanceGate>
                <div className="relative z-raised flex flex-col min-h-screen bg-transparent">
                  <HideOnAdmin><Navbar /></HideOnAdmin>
                  <HideOnAdmin>
                    <OrderDrawer />
                    <FloatingWhatsApp />
                  </HideOnAdmin>
                  <main className="flex-grow">
                    <PageTransition>
                      <Suspense fallback={
                        <div className="min-h-[50vh] flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full border-2 border-[#c5a059]/20 border-t-[#c5a059] animate-spin" />
                        </div>
                      }>
                      <Routes>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/collection" element={<CollectionPage />} />
                      <Route path="/about" element={<PhilosophyPage />} />
                      <Route path="/contact" element={<ContactPage />} />
                      <Route path="/collection/:seriesSlug" element={<SeriesOrProductRouter />} />
                      <Route path="/collection/:seriesSlug/:subSeriesSlug" element={<ProductPage />} />
                      <Route path="/order" element={<OrderPage />} />
                      <Route path="/order/confirmed" element={<OrderConfirmationPage />} />
                      <Route path="/login" element={<AuthPage />} />
                      <Route path="/my-orders" element={<MyOrdersPage />} />
                      <Route path="/my-builds" element={<MyBuildsPage />} />
                      <Route path="/my-orders/:id" element={<OrderDetailPage />} />
                      <Route path="/my-orders/:id/receipt" element={<ReceiptPage />} />
                      <Route path="/my-requests" element={<MyRequestsPage />} />
                      <Route path="/profile" element={<ProfileSetupPage isSetup={false} />} />
                      <Route path="/security" element={<SecurityPage />} />
                      <Route path="/profile/setup" element={<ProfileSetupPage isSetup={true} />} />
                      <Route path="/bat-consultant" element={<BatConsultantPage />} />
                      <Route path="/comparison" element={<ComparisonPage />} />
                      <Route path="/locate-us" element={<LocateUsPage />} />
                      <Route path="/track" element={<TrackOrderPage />} />
                      <Route path="/dashboard" element={<MyOrdersPage />} />
                      
                      {/* Admin Layout & Nested Routes */}
                      <Route path="/admin" element={<AdminLayout />}>
                        <Route index element={<Navigate to="/admin/dashboard" replace />} />
                        <Route path="dashboard" element={<AdminPage />} />
                        <Route path="customers" element={<AdminCustomersPage />} />
                        <Route path="orders" element={<AdminOrdersBoard />} />
                        <Route path="orders/:id" element={<AdminOrderDetailsPage />} />
                        <Route path="products" element={<AdminProductsPage />} />
                      <Route path="products/:seriesSlug" element={<AdminSeriesDetailPage />} />
                      <Route path="products/:seriesSlug/:productSlug" element={<AdminProductEditorPage />} />
                        <Route path="support" element={FEATURES.supportRequests ? <AdminSupportPage /> : <Navigate to="/admin" replace />} />
                        <Route path="enquiries" element={<AdminEnquiriesPage />} />
                        <Route path="content" element={<AdminContentEditorPage />} />
                        <Route path="audit" element={<AdminAuditPage />} />

                      </Route>
                      
                      {/* Legal Routes */}
                      <Route path="/bat-care" element={<BatCarePage />} />
                      <Route path="/shipping" element={<ShippingPage />} />
                      <Route path="/refund" element={<RefundPage />} />
                      <Route path="/privacy" element={<PrivacyPage />} />
                      <Route path="/terms" element={<TermsPage />} />
                      
                      {/* Catch-all 404 */}
                      <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                    </Suspense>
                  </PageTransition>
                </main>
                <HideOnAdmin><Footer /></HideOnAdmin>
              </div>
                </MaintenanceGate>
            </Router>
            </ProductsProvider>
          </AuthProvider>
      </OrderProvider>
      </ContentProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

