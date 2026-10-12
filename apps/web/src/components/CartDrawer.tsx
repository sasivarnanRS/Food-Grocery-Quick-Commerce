import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingBag, ShieldCheck, Clock } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';

export const CartDrawer: React.FC = () => {
  const { cart, itemCount, isDrawerOpen, setIsDrawerOpen, updateQuantity, removeFromCart, clearCart } = useCart();
  const { activeStore, deliveryMinutes } = useStore();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isDrawerOpen) return null;

  const handleCheckout = () => {
    setIsDrawerOpen(false);
    navigate('/checkout');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setIsDrawerOpen(false)}
        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-xs transition-opacity duration-300"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-neutral-900">Your Cart</h2>
                <p className="text-xs text-neutral-500">{itemCount} items selected</p>
              </div>
            </div>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Delivery ETA Banner */}
          <div className="bg-emerald-50 px-4 py-2.5 border-b border-emerald-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-brand-800 font-semibold">
              <Clock className="w-4 h-4 text-brand-600" />
              <span>Delivering in ~{deliveryMinutes} mins</span>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
              {activeStore?.name.slice(0, 18) || 'Dark Store #1'}
            </span>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-400">
                <div className="w-20 h-20 rounded-3xl bg-neutral-100 flex items-center justify-center text-neutral-300 mb-4">
                  <ShoppingBag className="w-10 h-10" />
                </div>
                <h3 className="text-base font-bold text-neutral-800 mb-1">Your cart is empty</h3>
                <p className="text-xs text-neutral-500 max-w-xs mb-6">
                  Add fresh groceries, fruits, veggies, or snacks to receive instant 10-minute delivery.
                </p>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-5 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-600/20 hover:bg-brand-700 transition-all"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              cart.items.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-neutral-100 hover:border-neutral-200 transition-all shadow-2xs"
                >
                  <img
                    src={item.product?.image || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=100'}
                    alt={item.product?.name || 'Product'}
                    className="w-14 h-14 object-cover rounded-xl bg-neutral-100 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-neutral-900 truncate">
                      {item.product?.name || 'Grocery Item'}
                    </h4>
                    <p className="text-[11px] text-neutral-400">
                      {item.product?.unit || '1 unit'}
                    </p>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-xs font-extrabold text-neutral-900">
                        ₹{item.discountPrice * item.quantity}
                      </span>
                      {item.unitPrice > item.discountPrice && (
                        <span className="text-[10px] text-neutral-400 line-through">
                          ₹{item.unitPrice * item.quantity}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity Controller */}
                  <div className="flex items-center bg-brand-600 text-white rounded-xl overflow-hidden shadow-xs shrink-0">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="p-1.5 hover:bg-brand-700 active:scale-90 transition-all"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-2 text-xs font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="p-1.5 hover:bg-brand-700 active:scale-90 transition-all"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bill Summary & Checkout */}
          {cart.items.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-neutral-100 bg-neutral-50/70 space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-neutral-600">
                  <span>Item Subtotal</span>
                  <span>₹{cart.subtotal}</span>
                </div>
                {cart.discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discounts Saved</span>
                    <span>-₹{cart.discountTotal}</span>
                  </div>
                )}
                <div className="flex justify-between text-neutral-600">
                  <span>Delivery Fee</span>
                  <span>{cart.deliveryFee === 0 ? <span className="text-brand-600 font-bold uppercase text-[10px]">FREE</span> : `₹${cart.deliveryFee}`}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Taxes & Charges (GST 5%)</span>
                  <span>₹{cart.tax}</span>
                </div>
                <div className="pt-2 border-t border-neutral-200 flex justify-between items-baseline font-extrabold text-neutral-900 text-sm">
                  <span>To Pay</span>
                  <span className="text-base text-brand-700">₹{cart.grandTotal}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-neutral-500 bg-white p-2.5 rounded-xl border border-neutral-200/80">
                <ShieldCheck className="w-4 h-4 text-brand-600 shrink-0" />
                <span>Inventory is verified and reserved atomically at checkout</span>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-extrabold rounded-2xl flex items-center justify-between px-5 text-sm shadow-lg shadow-brand-600/25 active:scale-98 transition-all"
              >
                <div className="text-left">
                  <span className="block text-xs font-semibold opacity-90">Pay ₹{cart.grandTotal}</span>
                  <span className="block text-xs font-black uppercase tracking-wider">Proceed to Checkout</span>
                </div>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
