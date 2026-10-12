import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  Package,
  Bike,
  Home,
  AlertTriangle,
  RotateCcw,
  Store,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { IOrder, OrderStatus } from '@quickcommerce/shared-types';

const STAGES: { status: OrderStatus; label: string; icon: React.ElementType }[] = [
  { status: 'ORDER_PLACED', label: 'Order Placed', icon: CheckCircle2 },
  { status: 'INVENTORY_RESERVED', label: 'Inventory Reserved', icon: ShieldCheck },
  { status: 'PREPARING_ORDER', label: 'Packing Order', icon: Package },
  { status: 'DELIVERY_PARTNER_ASSIGNED', label: 'Rider Assigned', icon: Bike },
  { status: 'PICKED_UP', label: 'Order Picked Up', icon: Bike },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: Bike },
  { status: 'DELIVERED', label: 'Delivered', icon: Home },
];

export const OrderTrackingPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<IOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = async () => {
    if (!orderId) return;
    try {
      const res = await apiClient.get(`/orders/${orderId}`);
      setOrder(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not load order tracking details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    // Poll every 3 seconds for real-time delivery transitions
    const interval = setInterval(fetchOrder, 3000);
    return () => clearInterval(interval);
  }, [orderId]);

  const handleCancelOrder = async () => {
    if (!orderId || !window.confirm('Are you sure you want to cancel this order? Reserved stock will be released back to the store.')) {
      return;
    }

    setIsCancelling(true);
    try {
      const res = await apiClient.post(`/orders/${orderId}/cancel`, {
        reason: 'Customer initiated cancellation from order tracking screen',
      });
      setOrder(res.data.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Unable to cancel order.');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-neutral-500">Connecting to order dispatch service...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold text-neutral-900">Order Not Found</h2>
        <p className="text-xs text-neutral-500">{error || 'Please check the order ID and try again.'}</p>
        <Link to="/" className="inline-block px-5 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold">
          Return to Store
        </Link>
      </div>
    );
  }

  const isCancelled = order.orderStatus === 'CANCELLED';
  const isFailed = order.orderStatus === 'FAILED';
  const isDelivered = order.orderStatus === 'DELIVERED';

  // Calculate current stage index
  const stageOrder: OrderStatus[] = [
    'ORDER_PLACED',
    'INVENTORY_RESERVED',
    'PREPARING_ORDER',
    'DELIVERY_PARTNER_ASSIGNED',
    'PICKED_UP',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
  ];
  const currentStageIndex = stageOrder.indexOf(order.orderStatus);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Order #{order.id.slice(-8).toUpperCase()}
            </span>
            <span
              className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                isCancelled
                  ? 'bg-red-100 text-red-700'
                  : isDelivered
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-brand-100 text-brand-800 animate-pulse'
              }`}
            >
              {order.orderStatus.replace(/_/g, ' ')}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-neutral-900">
            {isCancelled
              ? 'Order Cancelled'
              : isDelivered
              ? 'Order Delivered Successfully 🎉'
              : `Arriving in ~${order.estimatedDeliveryMinutes || 12} Minutes ⚡`}
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Placed on {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Store: {order.storeName || 'Indiranagar Hub'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOrder}
            className="p-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-600 transition-colors"
            title="Refresh Status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {!isCancelled && !isDelivered && (
            <button
              onClick={handleCancelOrder}
              disabled={isCancelling}
              className="px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-colors"
            >
              {isCancelling ? 'Cancelling...' : 'Cancel Order'}
            </button>
          )}
        </div>
      </div>

      {/* Real-time Order Stage Stepper */}
      {!isCancelled && !isFailed && (
        <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-8 shadow-sm">
          <h2 className="text-sm font-bold text-neutral-900 mb-6 uppercase tracking-wider">
            Live Order Progress
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
            {STAGES.map((stage, idx) => {
              const Icon = stage.icon;
              const isCompleted = currentStageIndex >= idx;
              const isCurrent = currentStageIndex === idx;

              return (
                <div key={stage.status} className="flex flex-col items-center text-center relative group">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 mb-2 ${
                      isCurrent
                        ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30 scale-110 ring-4 ring-brand-100'
                        : isCompleted
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-neutral-100 text-neutral-400'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className={`text-xs leading-tight font-bold ${
                      isCurrent
                        ? 'text-brand-700 font-extrabold'
                        : isCompleted
                        ? 'text-neutral-900'
                        : 'text-neutral-400'
                    }`}
                  >
                    {stage.label}
                  </span>
                  <span className="text-[10px] text-neutral-400 mt-0.5">
                    Stage {idx + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Two Column Layout: Partner & Timeline + Order Items */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left: Rider & Timeline */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Assigned Delivery Partner Card */}
          {order.deliveryPartnerName && (
            <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 shadow-2xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-brand-700 flex items-center justify-center font-bold">
                <Bike className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-neutral-900">
                  {order.deliveryPartnerName}
                </h3>
                <p className="text-xs text-neutral-500">Assigned QuickCommerce Delivery Partner</p>
                <span className="text-[11px] font-semibold text-brand-700 mt-1 inline-block">
                  ⚡ 5.0 ★ Top Rated Rider • Direct Dispatch
                </span>
              </div>
            </div>
          )}

          {/* Detailed Audit Timeline */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
              Activity History
            </h3>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-200">
              {order.timeline.map((item, idx) => (
                <div key={idx} className="relative flex items-start gap-3">
                  <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-brand-600 ring-4 ring-brand-50" />
                  <div>
                    <p className="text-xs font-bold text-neutral-900">{item.description}</p>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right: Items in Order */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
              Order Items ({order.items.length})
            </h3>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 text-xs">
                  <img src={item.image} alt={item.name} className="w-10 h-10 object-cover rounded-xl bg-neutral-100 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-neutral-800 truncate">{item.name}</p>
                    <p className="text-[10px] text-neutral-400">{item.quantity} x {item.unit}</p>
                  </div>
                  <span className="font-extrabold text-neutral-900">
                    ₹{item.discountPrice * item.quantity}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-neutral-100 pt-3 space-y-1.5 text-xs text-neutral-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{order.subtotal}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Discount</span>
                  <span>-₹{order.discount}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span>{order.deliveryFee === 0 ? <strong className="text-brand-600">FREE</strong> : `₹${order.deliveryFee}`}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxes</span>
                <span>₹{order.tax}</span>
              </div>
              <div className="border-t border-neutral-200 pt-2 flex justify-between font-black text-sm text-neutral-900">
                <span>Total Paid</span>
                <span className="text-base text-brand-700">₹{order.total}</span>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-neutral-400 border-t border-neutral-100 font-mono">
              <p>Payment: {order.paymentMethod} ({order.paymentStatus})</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
