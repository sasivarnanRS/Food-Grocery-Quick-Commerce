import React, { createContext, useContext, useState, useEffect } from 'react';
import { ICart, ICartItem, IProduct } from '@quickcommerce/shared-types';
import { apiClient } from '../api/client';
import { useAuth } from './AuthContext';

interface CartContextType {
  cart: ICart;
  itemCount: number;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  addToCart: (product: IProduct, storeId: string, quantity?: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  getItemQuantity: (productId: string) => number;
}

const emptyCart: ICart = {
  id: '',
  userId: '',
  items: [],
  subtotal: 0,
  discountTotal: 0,
  deliveryFee: 0,
  tax: 0,
  grandTotal: 0,
  updatedAt: new Date().toISOString(),
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<ICart>(emptyCart);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  const refreshCart = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await apiClient.get('/cart');
      setCart(res.data.data);
    } catch {
      // Cart fetch fail handled silently
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshCart();
    } else {
      setCart(emptyCart);
    }
  }, [isAuthenticated]);

  const addToCart = async (product: IProduct, storeId: string, quantity = 1) => {
    if (isAuthenticated) {
      const res = await apiClient.post('/cart/items', {
        productId: product.id,
        storeId,
        quantity,
      });
      setCart(res.data.data);
    } else {
      // Local Guest Cart
      const unitPrice = product.price;
      const discountAmount = product.discount ? (product.price * product.discount) / 100 : 0;
      const discountPrice = Number((unitPrice - discountAmount).toFixed(2));

      const existingIndex = cart.items.findIndex((i) => i.productId === product.id);
      let updatedItems = [...cart.items];

      if (existingIndex > -1) {
        updatedItems[existingIndex].quantity += quantity;
      } else {
        updatedItems.push({
          productId: product.id,
          storeId,
          quantity,
          unitPrice,
          discountPrice,
          product,
        });
      }

      recalculateLocalCart(updatedItems);
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (isAuthenticated) {
      const res = await apiClient.patch(`/cart/items/${productId}`, { quantity });
      setCart(res.data.data);
    } else {
      let updatedItems = cart.items
        .map((i) => (i.productId === productId ? { ...i, quantity } : i))
        .filter((i) => i.quantity > 0);
      recalculateLocalCart(updatedItems);
    }
  };

  const removeFromCart = async (productId: string) => {
    if (isAuthenticated) {
      const res = await apiClient.delete(`/cart/items/${productId}`);
      setCart(res.data.data);
    } else {
      const updatedItems = cart.items.filter((i) => i.productId !== productId);
      recalculateLocalCart(updatedItems);
    }
  };

  const clearCart = async () => {
    if (isAuthenticated) {
      await apiClient.delete('/cart');
    }
    setCart(emptyCart);
  };

  const recalculateLocalCart = (items: ICartItem[]) => {
    let subtotal = 0;
    let discountTotal = 0;
    for (const item of items) {
      const p = item.product;
      const price = p ? p.price : item.unitPrice;
      const disc = p && p.discount ? (p.price * p.discount) / 100 : 0;
      subtotal += price * item.quantity;
      discountTotal += disc * item.quantity;
    }
    subtotal = Number(subtotal.toFixed(2));
    discountTotal = Number(discountTotal.toFixed(2));
    const deliveryFee = subtotal > 0 ? (subtotal >= 499 ? 0 : 25) : 0;
    const tax = Number(((subtotal - discountTotal) * 0.05).toFixed(2));
    const grandTotal = Number((subtotal - discountTotal + deliveryFee + tax).toFixed(2));

    setCart({
      id: 'guest-cart',
      userId: 'guest',
      items,
      subtotal,
      discountTotal,
      deliveryFee,
      tax,
      grandTotal: Math.max(0, grandTotal),
      updatedAt: new Date().toISOString(),
    });
  };

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  const getItemQuantity = (productId: string) => {
    const item = cart.items.find((i) => i.productId === productId);
    return item ? item.quantity : 0;
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        itemCount,
        isDrawerOpen,
        setIsDrawerOpen,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        refreshCart,
        getItemQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
