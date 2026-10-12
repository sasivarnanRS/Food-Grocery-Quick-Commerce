import React from 'react';
import { Plus, Minus, Clock } from 'lucide-react';
import { IProduct } from '@quickcommerce/shared-types';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';

interface ProductCardProps {
  product: IProduct;
  onSelect?: (product: IProduct) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect }) => {
  const { getItemQuantity, addToCart, updateQuantity } = useCart();
  const { activeStore } = useStore();

  const quantity = getItemQuantity(product.id);
  const discountAmount = product.discount ? (product.price * product.discount) / 100 : 0;
  const finalPrice = Math.round(product.price - discountAmount);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeStore) {
      addToCart(product, activeStore.id, 1);
    }
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateQuantity(product.id, quantity + 1);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateQuantity(product.id, quantity - 1);
  };

  return (
    <div
      onClick={() => onSelect?.(product)}
      className="group bg-white rounded-3xl border border-neutral-200/80 p-3 sm:p-4 hover:border-brand-300 hover:shadow-xl hover:shadow-brand-600/5 transition-all duration-200 flex flex-col justify-between cursor-pointer relative"
    >
      {/* Discount Badge */}
      {product.discount > 0 && (
        <span className="absolute top-3 left-3 z-10 bg-brand-600 text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full shadow-xs">
          {product.discount}% OFF
        </span>
      )}

      {/* Image container */}
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-neutral-100 mb-3 flex items-center justify-center">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {/* Delivery Time Badge on image */}
        <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-xs text-neutral-800 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
          <Clock className="w-3 h-3 text-brand-600" />
          <span>10 MINS</span>
        </div>
      </div>

      {/* Product Information */}
      <div className="flex-1 flex flex-col">
        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
          {product.unit}
        </span>
        <h3 className="text-sm font-bold text-neutral-900 group-hover:text-brand-700 transition-colors line-clamp-2 leading-snug mb-3">
          {product.name}
        </h3>
      </div>

      {/* Pricing & Add Button */}
      <div className="flex items-center justify-between pt-2 border-t border-neutral-100 mt-auto">
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-extrabold text-neutral-900">
              ₹{finalPrice}
            </span>
            {product.discount > 0 && (
              <span className="text-xs text-neutral-400 line-through">
                ₹{product.price}
              </span>
            )}
          </div>
        </div>

        {/* Dynamic Quantity Controller */}
        {quantity === 0 ? (
          <button
            onClick={handleAdd}
            className="px-4 py-1.5 bg-brand-50 hover:bg-brand-600 border border-brand-300 hover:border-brand-600 text-brand-700 hover:text-white rounded-xl text-xs font-black tracking-wider transition-all shadow-xs active:scale-95 uppercase"
          >
            ADD
          </button>
        ) : (
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center bg-brand-600 text-white rounded-xl overflow-hidden shadow-xs"
          >
            <button
              onClick={handleDecrement}
              className="p-1.5 hover:bg-brand-700 active:scale-90 transition-all"
              aria-label="Decrease quantity"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-xs font-extrabold">{quantity}</span>
            <button
              onClick={handleIncrement}
              className="p-1.5 hover:bg-brand-700 active:scale-90 transition-all"
              aria-label="Increase quantity"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
