import React from 'react';
import { X, Clock, ShieldCheck, Plus, Minus, Store } from 'lucide-react';
import { IProduct } from '@quickcommerce/shared-types';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';

interface ProductDetailsModalProps {
  product: IProduct | null;
  onClose: () => void;
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({ product, onClose }) => {
  const { getItemQuantity, addToCart, updateQuantity } = useCart();
  const { activeStore, deliveryMinutes } = useStore();

  if (!product) return null;

  const quantity = getItemQuantity(product.id);
  const discountAmount = product.discount ? (product.price * product.discount) / 100 : 0;
  const finalPrice = Math.round(product.price - discountAmount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-neutral-900/50 backdrop-blur-xs transition-opacity" />

      <div className="relative bg-white rounded-3xl border border-neutral-200/90 shadow-2xl w-full max-w-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150 flex flex-col md:flex-row">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-white/80 hover:bg-white text-neutral-600 hover:text-neutral-900 shadow-xs"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Product Image */}
        <div className="w-full md:w-1/2 bg-neutral-100 p-6 flex items-center justify-center relative">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-64 md:h-80 object-cover rounded-2xl shadow-sm"
          />
          {product.discount > 0 && (
            <span className="absolute top-6 left-6 bg-brand-600 text-white text-xs font-black uppercase px-2.5 py-1 rounded-full shadow-md">
              {product.discount}% OFF
            </span>
          )}
        </div>

        {/* Details & Action */}
        <div className="w-full md:w-1/2 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md">
                {product.unit}
              </span>
              <span className="text-xs font-semibold text-neutral-500">
                {product.categoryName || 'Grocery'}
              </span>
            </div>

            <h2 className="text-xl font-extrabold text-neutral-900 leading-snug mb-2">
              {product.name}
            </h2>

            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-2xl font-black text-neutral-900">
                ₹{finalPrice}
              </span>
              {product.discount > 0 && (
                <span className="text-sm text-neutral-400 line-through">
                  ₹{product.price}
                </span>
              )}
            </div>

            {/* Description */}
            <div className="mb-4">
              <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1">
                Description
              </h4>
              <p className="text-xs text-neutral-600 leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Store & Stock info */}
            <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100 space-y-2 mb-6">
              <div className="flex items-center gap-2 text-xs font-medium text-neutral-700">
                <Store className="w-4 h-4 text-neutral-500" />
                <span>Store: <strong>{activeStore?.name || 'Local Fulfillment Hub'}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Estimated Arrival: <strong>~{deliveryMinutes} minutes</strong></span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-neutral-700">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Guaranteed Freshness & Quality</span>
              </div>
            </div>
          </div>

          {/* Add to Cart button */}
          <div className="pt-2 border-t border-neutral-100">
            {quantity === 0 ? (
              <button
                onClick={() => activeStore && addToCart(product, activeStore.id, 1)}
                className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-brand-600/20 active:scale-98 transition-all"
              >
                Add to Cart • ₹{finalPrice}
              </button>
            ) : (
              <div className="flex items-center justify-between bg-brand-50 border border-brand-200 p-2 rounded-2xl">
                <span className="text-xs font-bold text-brand-900 pl-3">
                  In Cart: {quantity} {quantity === 1 ? 'pack' : 'packs'}
                </span>
                <div className="flex items-center bg-brand-600 text-white rounded-xl overflow-hidden shadow-xs">
                  <button
                    onClick={() => updateQuantity(product.id, quantity - 1)}
                    className="p-2 hover:bg-brand-700"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-3 text-xs font-black">{quantity}</span>
                  <button
                    onClick={() => updateQuantity(product.id, quantity + 1)}
                    className="p-2 hover:bg-brand-700"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
