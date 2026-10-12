import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { StoreProvider } from './context/StoreContext';
import { CartProvider } from './context/CartContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { AuthModal } from './components/AuthModal';
import { LocationModal } from './components/LocationModal';
import { ProductDetailsModal } from './components/ProductDetailsModal';

import { HomePage } from './pages/HomePage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderTrackingPage } from './pages/OrderTrackingPage';
import { OrdersListPage } from './pages/OrdersListPage';
import { DeliveryPartnerPage } from './pages/DeliveryPartnerPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { SystemDesignDashboard } from './pages/SystemDesignDashboard';
import { IProduct } from '@quickcommerce/shared-types';

export const App: React.FC = () => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<IProduct | null>(null);

  return (
    <BrowserRouter>
      <AuthProvider>
        <StoreProvider>
          <CartProvider>
            <div className="min-h-screen flex flex-col bg-neutral-50 text-neutral-900 selection:bg-brand-500 selection:text-white">
              
              <Navbar
                onOpenAuth={() => setIsAuthOpen(true)}
                onOpenLocation={() => setIsLocationOpen(true)}
              />

              <main className="flex-1">
                <Routes>
                  <Route
                    path="/"
                    element={<HomePage onSelectProduct={(p: IProduct) => setSelectedProduct(p)} />}
                  />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/order-tracking/:orderId" element={<OrderTrackingPage />} />
                  <Route path="/orders" element={<OrdersListPage />} />
                  <Route path="/delivery/dashboard" element={<DeliveryPartnerPage />} />
                  <Route path="/admin" element={<AdminDashboardPage />} />
                  <Route path="/admin/system-design" element={<SystemDesignDashboard />} />
                </Routes>
              </main>

              <Footer />

              {/* Global Flyouts and Modals */}
              <CartDrawer />
              <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
              <LocationModal isOpen={isLocationOpen} onClose={() => setIsLocationOpen(false)} />
              <ProductDetailsModal
                product={selectedProduct}
                onClose={() => setSelectedProduct(null)}
              />

            </div>
          </CartProvider>
        </StoreProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
