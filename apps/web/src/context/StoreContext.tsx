import React, { createContext, useContext, useState, useEffect } from 'react';
import { IStore } from '@quickcommerce/shared-types';
import { apiClient } from '../api/client';

interface StoreContextType {
  stores: IStore[];
  activeStore: IStore | null;
  deliveryLocation: string;
  setActiveStore: (store: IStore) => void;
  setDeliveryLocation: (location: string) => void;
  deliveryMinutes: number;
}

const defaultStores: IStore[] = [
  {
    id: 'store_indiranagar',
    name: 'Indiranagar Quick Hub #1',
    address: '100 Feet Rd, Indiranagar, Bengaluru',
    latitude: 12.9716,
    longitude: 77.6412,
    active: true,
    distanceKm: 1.2,
  },
  {
    id: 'store_koramangala',
    name: 'Koramangala Express Dark Store',
    address: '80 Feet Rd, 4th Block, Koramangala',
    latitude: 12.9352,
    longitude: 77.6245,
    active: true,
    distanceKm: 2.8,
  },
  {
    id: 'store_hsr',
    name: 'HSR Layout Super Store',
    address: 'Sector 2, HSR Layout, Bengaluru',
    latitude: 12.9121,
    longitude: 77.6446,
    active: true,
    distanceKm: 4.5,
  },
];

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stores, setStores] = useState<IStore[]>(defaultStores);
  const [activeStore, setActiveStore] = useState<IStore | null>(defaultStores[0]);
  const [deliveryLocation, setDeliveryLocation] = useState<string>('Indiranagar, Bengaluru (100 Feet Rd)');

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await apiClient.get('/inventory/nearby?lat=12.9716&lon=77.6412&radius=15');
        if (res.data.data && res.data.data.length > 0) {
          setStores(res.data.data);
          setActiveStore(res.data.data[0]);
        }
      } catch {
        // Fallback to default demonstration stores
      }
    };
    fetchStores();
  }, []);

  const deliveryMinutes = activeStore?.distanceKm ? Math.max(9, Math.round(activeStore.distanceKm * 4 + 7)) : 11;

  return (
    <StoreContext.Provider
      value={{
        stores,
        activeStore,
        deliveryLocation,
        setActiveStore,
        setDeliveryLocation,
        deliveryMinutes,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within a StoreProvider');
  return context;
};
