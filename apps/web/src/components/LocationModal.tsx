import React from 'react';
import { X, MapPin, Store, Check, Info } from 'lucide-react';
import { useStore } from '../context/StoreContext';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LocationModal: React.FC<LocationModalProps> = ({ isOpen, onClose }) => {
  const { stores, activeStore, setActiveStore, setDeliveryLocation } = useStore();

  if (!isOpen) return null;

  const handleSelectStore = (store: (typeof stores)[0]) => {
    setActiveStore(store);
    setDeliveryLocation(store.address);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-neutral-900/50 backdrop-blur-xs transition-opacity" />

      <div className="relative bg-white rounded-3xl border border-neutral-200/90 shadow-2xl w-full max-w-lg overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/70">
          <div>
            <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-brand-600" />
              <span>Select Delivery Hub & Location</span>
            </h3>
            <p className="text-xs text-neutral-500">Pick a nearby micro-fulfillment dark store</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demonstration Data Notice */}
        <div className="px-5 py-3 bg-amber-50/70 border-b border-amber-100 flex items-start gap-2.5 text-xs text-amber-800">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Demonstration Store Coordinates: Geocoded from seeded Bangalore fulfillment centers with live distance-calculated delivery times.
          </span>
        </div>

        {/* Store Selection List */}
        <div className="p-5 space-y-3 max-h-96 overflow-y-auto">
          {stores.map((store) => {
            const isSelected = activeStore?.id === store.id;
            const eta = store.distanceKm ? Math.max(9, Math.round(store.distanceKm * 4 + 7)) : 11;

            return (
              <div
                key={store.id}
                onClick={() => handleSelectStore(store)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'border-brand-500 bg-brand-50/40 shadow-xs'
                    : 'border-neutral-200 hover:border-brand-300 hover:bg-neutral-50/50'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-brand-600 text-white' : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-neutral-900">{store.name}</h4>
                    <p className="text-xs text-neutral-500 max-w-xs">{store.address}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] font-semibold">
                      <span className="text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                        ⚡ {eta} mins delivery
                      </span>
                      {store.distanceKm !== undefined && (
                        <span className="text-neutral-500">
                          📍 {store.distanceKm} km away
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Confirm Location
          </button>
        </div>

      </div>
    </div>
  );
};
