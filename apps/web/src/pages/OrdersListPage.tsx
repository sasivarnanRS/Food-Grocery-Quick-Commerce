import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Clock, ArrowRight, ShieldCheck } from 'lucide-react';
import { apiClient } from '../api/client';
import { IOrder } from '@quickcommerce/shared-types';
import { useAuth } from '../context/AuthContext';

export const OrdersListPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await apiClient.get('/orders');
        setOrders(res.data.data || []);
      } catch (err) {
        console.error('Error fetching orders:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchOrders();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Your Orders</h1>
        <p className="text-xs text-neutral-500">Track current deliveries and view order history</p>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-xs text-neutral-400">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-neutral-200/80 p-12 text-center space-y-3">
          <Package className="w-12 h-12 text-neutral-300 mx-auto" />
          <h3 className="text-base font-bold text-neutral-800">No orders placed yet</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Place your first 10-minute grocery order to see live tracking and rider assignments.
          </p>
          <Link
            to="/"
            className="inline-block px-5 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-brand-700"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-2xs hover:border-brand-300 transition-all space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3 text-xs">
                <div>
                  <span className="font-bold text-neutral-900">Order #{order.id.slice(-8).toUpperCase()}</span>
                  <span className="text-neutral-400 ml-2 font-mono">
                    {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                      order.orderStatus === 'DELIVERED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : order.orderStatus === 'CANCELLED'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-brand-100 text-brand-800 animate-pulse'
                    }`}
                  >
                    {order.orderStatus.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {/* Items row */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 overflow-x-auto py-1">
                  {order.items.slice(0, 4).map((item, idx) => (
                    <img
                      key={idx}
                      src={item.image}
                      alt={item.name}
                      title={`${item.name} (${item.quantity}x)`}
                      className="w-12 h-12 object-cover rounded-xl bg-neutral-100 shrink-0 border border-neutral-100"
                    />
                  ))}
                  {order.items.length > 4 && (
                    <div className="w-12 h-12 rounded-xl bg-neutral-100 text-neutral-600 font-bold text-xs flex items-center justify-center shrink-0">
                      +{order.items.length - 4}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-xs text-neutral-400 block">Total</span>
                    <span className="text-base font-black text-neutral-900">₹{order.total}</span>
                  </div>

                  <Link
                    to={`/order-tracking/${order.id}`}
                    className="flex items-center gap-1.5 px-4 py-2 bg-brand-50 hover:bg-brand-600 text-brand-700 hover:text-white rounded-xl text-xs font-bold transition-all"
                  >
                    <span>Track Order</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
