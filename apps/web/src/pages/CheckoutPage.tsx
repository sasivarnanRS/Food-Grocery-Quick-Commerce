import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import {
  ShieldCheck,
  CreditCard,
  Banknote,
  MapPin,
  Clock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { PaymentMethod } from '@quickcommerce/shared-types';

export const CheckoutPage: React.FC = () => {
  const { cart, clearCart } = useCart();
  const { activeStore, deliveryMinutes } = useStore();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [street, setStreet] = useState('Flat 402, Green Glen Layout, 100 Feet Road');
  const [city, setCity] = useState('Bengaluru');
  const [pincode, setPincode] = useState('560038');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MOCK_ONLINE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate or maintain client-side idempotency key for this checkout attempt
  const [idempotencyKey] = useState<string>(() => `idemp_${uuidv4()}`);

  if (cart.items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-2xl font-bold text-neutral-900">Your cart is empty</h2>
        <p className="text-xs text-neutral-500">Please add items to your cart before proceeding to checkout.</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-brand-700"
        >
          Return to Store
        </button>
      </div>
    );
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setError('Please sign in or select a demo account before placing your order.');
      return;
    }

    if (!activeStore) {
      setError('Please select a dark store location.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const orderPayload = {
        idempotencyKey,
        storeId: activeStore.id,
        deliveryAddress: {
          street,
          city,
          pincode,
          latitude: activeStore.latitude,
          longitude: activeStore.longitude,
        },
        paymentMethod,
        items: cart.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      };

      const res = await apiClient.post('/orders', orderPayload);
      const createdOrder = res.data.data;

      // Clear local cart
      await clearCart();

      // Redirect directly to real-time order tracking page
      navigate(`/order-tracking/${createdOrder.id}`);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error?.details ||
        'Failed to process order. Please try again.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Checkout & Delivery</h1>
        <p className="text-xs text-neutral-500">
          Confirm delivery address and review atomic reservation items
        </p>
      </div>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left column: Address & Payment Details */}
        <div className="md:col-span-2 space-y-6">
          
          {error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3 text-xs text-red-700">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Checkout Issue:</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Delivery Address Card */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Delivery Address</h3>
                <p className="text-xs text-neutral-500">Delivering from {activeStore?.name}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Street Address</label>
                <input
                  type="text"
                  required
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:bg-white focus:border-brand-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:bg-white focus:border-brand-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    required
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:bg-white focus:border-brand-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Card */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Payment Method</h3>
                <p className="text-xs text-neutral-500">Select payment simulation option</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-4 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                  paymentMethod === 'MOCK_ONLINE'
                    ? 'border-brand-500 bg-brand-50/40 shadow-xs'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'MOCK_ONLINE'}
                  onChange={() => setPaymentMethod('MOCK_ONLINE')}
                  className="mt-1 text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <span className="block text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                    <span>Mock Instant Online Payment</span>
                    <span className="text-[10px] font-extrabold text-brand-700 bg-brand-100 px-1.5 py-0.5 rounded-md">
                      Simulated
                    </span>
                  </span>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Demonstration gateway (UPI / Card simulation without actual charge)
                  </p>
                </div>
              </label>

              <label
                className={`p-4 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                  paymentMethod === 'COD'
                    ? 'border-brand-500 bg-brand-50/40 shadow-xs'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'COD'}
                  onChange={() => setPaymentMethod('COD')}
                  className="mt-1 text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <span className="block text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span>Cash on Delivery (COD)</span>
                  </span>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Pay upon physical package receipt at your doorstep
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Idempotency & Concurrency Guarantee Card */}
          <div className="p-4 bg-neutral-100 rounded-2xl border border-neutral-200/80 text-xs text-neutral-600 space-y-1 font-mono">
            <div className="flex items-center gap-2 font-bold text-neutral-900">
              <Lock className="w-3.5 h-3.5 text-brand-600" />
              <span>Idempotency Key Attached:</span>
            </div>
            <div className="text-[11px] text-neutral-500 truncate">{idempotencyKey}</div>
            <p className="text-[10px] text-neutral-500 font-sans pt-1">
              Guarantees zero duplicate charges or double inventory reservations even if network retries occur.
            </p>
          </div>

        </div>

        {/* Right column: Order Summary */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-neutral-900 border-b border-neutral-100 pb-3">
              Order Summary ({cart.items.length} items)
            </h3>

            {/* Quick items preview */}
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {cart.items.map((item) => (
                <div key={item.productId} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate max-w-[170px]">
                    <span className="font-bold text-neutral-800">{item.quantity}x</span>
                    <span className="truncate text-neutral-700">{item.product?.name || 'Item'}</span>
                  </div>
                  <span className="font-extrabold text-neutral-900 shrink-0">
                    ₹{item.discountPrice * item.quantity}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-neutral-100 pt-3 space-y-2 text-xs">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal</span>
                <span>₹{cart.subtotal}</span>
              </div>
              {cart.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Discount</span>
                  <span>-₹{cart.discountTotal}</span>
                </div>
              )}
              <div className="flex justify-between text-neutral-600">
                <span>Delivery Fee</span>
                <span>{cart.deliveryFee === 0 ? <strong className="text-brand-600">FREE</strong> : `₹${cart.deliveryFee}`}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Taxes (5% GST)</span>
                <span>₹{cart.tax}</span>
              </div>
              <div className="border-t border-neutral-200 pt-2 flex justify-between items-baseline font-black text-sm text-neutral-900">
                <span>Total Amount</span>
                <span className="text-lg text-brand-700">₹{cart.grandTotal}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-brand-600/25 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Reserving Inventory...</span>
                </>
              ) : (
                <>
                  <span>Place Order • ₹{cart.grandTotal}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="text-[10px] text-center text-neutral-400">
              By placing order, inventory is locked atomically in MongoDB.
            </p>
          </div>
        </div>

      </form>
    </div>
  );
};
