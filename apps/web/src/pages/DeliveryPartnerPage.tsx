import React, { useState, useEffect } from 'react';
import { Bike, CheckCircle2, Clock, MapPin, Package, RefreshCw, AlertCircle } from 'lucide-react';
import { apiClient } from '../api/client';
import { IDelivery, DeliveryStatus } from '@quickcommerce/shared-types';
import { useAuth } from '../context/AuthContext';

export const DeliveryPartnerPage: React.FC = () => {
  const { user, loginDemo } = useAuth();
  const [deliveries, setDeliveries] = useState<IDelivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchAssignments = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/delivery/assignments');
      setDeliveries(res.data.data || []);
    } catch (err) {
      console.error('Error fetching assignments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [user]);

  const handleUpdateStatus = async (deliveryId: string, nextStatus: DeliveryStatus) => {
    setUpdatingId(deliveryId);
    try {
      await apiClient.patch(`/delivery/assignments/${deliveryId}/status`, {
        status: nextStatus,
      });
      await fetchAssignments();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center text-white shadow-lg">
            <Bike className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black">Rider Fleet Portal</h1>
              <span className="text-[10px] font-bold uppercase bg-brand-500/20 text-brand-300 px-2 py-0.5 rounded-md border border-brand-500/30">
                Live Dispatch
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Active Rider: {user?.name || 'Unauthenticated'} ({user?.email || 'N/A'})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user?.role !== 'DELIVERY_PARTNER' && (
            <button
              onClick={() => loginDemo('DELIVERY_PARTNER')}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
            >
              ⚡ Switch to Rider Demo Account
            </button>
          )}
          <button
            onClick={fetchAssignments}
            className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
            title="Refresh Deliveries"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Deliveries Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-neutral-900">Assigned Order Deliveries</h2>
            <p className="text-xs text-neutral-500">Orders dispatched from nearby dark stores</p>
          </div>
          <span className="text-xs font-mono font-bold bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full">
            {deliveries.length} Total Deliveries
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-neutral-400">Loading delivery fleet assignments...</div>
        ) : deliveries.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-neutral-200 space-y-2 text-neutral-400">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-base font-bold text-neutral-800">All deliveries fulfilled!</h3>
            <p className="text-xs text-neutral-500">No pending orders in the dispatch queue.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {deliveries.map((delivery) => {
              const isDelivered = delivery.status === 'DELIVERED';
              const isUpdating = updatingId === delivery.id;

              return (
                <div
                  key={delivery.id}
                  className="bg-white rounded-3xl border border-neutral-200/80 p-5 space-y-4 shadow-2xs hover:border-brand-300 transition-all"
                >
                  <div className="flex items-center justify-between text-xs border-b border-neutral-100 pb-3">
                    <div>
                      <span className="font-extrabold text-neutral-900">
                        Order #{delivery.orderId.slice(-8).toUpperCase()}
                      </span>
                      <span className="text-neutral-400 ml-2 font-mono text-[11px]">
                        ETA: ~{delivery.estimatedDeliveryMinutes}m
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                        isDelivered
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-brand-100 text-brand-800 animate-pulse'
                      }`}
                    >
                      {delivery.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-neutral-600">
                    <p className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Created: {new Date(delivery.createdAt).toLocaleTimeString()}</span>
                    </p>
                    {delivery.assignedAt && (
                      <p className="flex items-center gap-1.5">
                        <Bike className="w-3.5 h-3.5 text-brand-600" />
                        <span>Rider Assigned: {delivery.partnerName || 'You'}</span>
                      </p>
                    )}
                  </div>

                  {/* Action Transition Buttons */}
                  <div className="pt-2 border-t border-neutral-100 flex flex-wrap gap-2">
                    {delivery.status === 'PENDING' && (
                      <button
                        onClick={() => handleUpdateStatus(delivery.id, 'ACCEPTED')}
                        disabled={isUpdating}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all"
                      >
                        Accept Assignment
                      </button>
                    )}

                    {delivery.status === 'ASSIGNED' && (
                      <button
                        onClick={() => handleUpdateStatus(delivery.id, 'ACCEPTED')}
                        disabled={isUpdating}
                        className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all"
                      >
                        Accept Order
                      </button>
                    )}

                    {delivery.status === 'ACCEPTED' && (
                      <button
                        onClick={() => handleUpdateStatus(delivery.id, 'PICKED_UP')}
                        disabled={isUpdating}
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all"
                      >
                        Mark Picked Up from Store
                      </button>
                    )}

                    {delivery.status === 'PICKED_UP' && (
                      <button
                        onClick={() => handleUpdateStatus(delivery.id, 'OUT_FOR_DELIVERY')}
                        disabled={isUpdating}
                        className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all"
                      >
                        Start Delivery Run (Out for Delivery)
                      </button>
                    )}

                    {delivery.status === 'OUT_FOR_DELIVERY' && (
                      <button
                        onClick={() => handleUpdateStatus(delivery.id, 'DELIVERED')}
                        disabled={isUpdating}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md"
                      >
                        ✓ Mark Delivered to Customer
                      </button>
                    )}

                    {isDelivered && (
                      <div className="w-full py-2 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold text-center">
                        ✓ Delivery Complete
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
