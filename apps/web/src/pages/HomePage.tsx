import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Clock,
  Sparkles,
  Zap,
  TrendingUp,
  ShieldCheck,
  Filter,
  CheckCircle2,
  RefreshCw,
  Search,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { IProduct, ICategory } from '@quickcommerce/shared-types';
import { ProductCard } from '../components/ProductCard';
import { useStore } from '../context/StoreContext';

interface HomePageProps {
  onSelectProduct: (product: IProduct) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onSelectProduct }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get('category') || '';
  const searchQuery = searchParams.get('search') || '';

  const { activeStore, deliveryLocation, deliveryMinutes } = useStore();

  const [products, setProducts] = useState<IProduct[]>([]);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCached, setIsCached] = useState(false);
  const [servedBy, setServedBy] = useState<string>('');

  // Fetch Categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await apiClient.get('/categories');
        setCategories(res.data.data || []);
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch Products based on search and category
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const params: Record<string, string> = { limit: '40' };
        if (selectedCategory) params.category = selectedCategory;
        if (searchQuery) params.search = searchQuery;

        const res = await apiClient.get('/products', { params });
        setProducts(res.data.data || []);
        setIsCached(res.data.meta?.cached || false);
        setServedBy(res.data.meta?.servedBy || '');
      } catch (err) {
        console.error('Error fetching products:', err);
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [selectedCategory, searchQuery]);

  const handleCategoryClick = (slug: string) => {
    if (selectedCategory === slug) {
      searchParams.delete('category');
    } else {
      searchParams.set('category', slug);
    }
    setSearchParams(searchParams);
  };

  const handleClearFilter = () => {
    setSearchParams({});
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-10">
      
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-emerald-800 via-brand-700 to-emerald-600 text-white p-6 sm:p-10 shadow-xl shadow-brand-700/10">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider text-emerald-100">
            <Zap className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            <span>Instant Grocery Delivery</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Fresh Groceries Delivered in{' '}
            <span className="text-yellow-300 underline decoration-yellow-400/50 decoration-wavy">
              {deliveryMinutes} Minutes
            </span>
          </h1>
          <p className="text-sm sm:text-base text-emerald-100 font-medium">
            Over 30+ farm-fresh veggies, fruits, dairy, bakery and household staples stored in nearby dark stores.
          </p>

          {/* Quick Metrics on Hero */}
          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-bold text-white/90">
            <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-xl">
              <Clock className="w-4 h-4 text-yellow-300" />
              <span>Avg Delivery: {deliveryMinutes} Mins</span>
            </div>
            <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-xl">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>100% Quality Guaranteed</span>
            </div>
            {isCached && (
              <div className="flex items-center gap-1.5 bg-emerald-950/40 px-3 py-1.5 rounded-xl text-yellow-200">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Redis Accelerated (Cached)</span>
              </div>
            )}
          </div>
        </div>

        {/* Decorative background shapes */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-white/10 to-transparent pointer-events-none" />
      </div>

      {/* 10 Grocery Categories Row */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-neutral-900 tracking-tight">
              Explore Categories
            </h2>
            <p className="text-xs text-neutral-500">Pick from our handpicked daily essentials</p>
          </div>
          {selectedCategory && (
            <button
              onClick={handleClearFilter}
              className="text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 px-3 py-1.5 rounded-xl transition-colors"
            >
              Clear Category Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-3">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.slug;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.slug)}
                className={`p-3 rounded-2xl flex flex-col items-center text-center transition-all group ${
                  isSelected
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25 scale-105'
                    : 'bg-white hover:bg-neutral-100/70 border border-neutral-200/80 text-neutral-800 hover:border-brand-300'
                }`}
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-100 mb-2 shrink-0">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <span className="text-[11px] font-bold line-clamp-1 leading-tight">
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Active Store & Live Diagnostics Ribbon */}
      <div className="p-3.5 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="font-bold text-neutral-800">
            Fulfilling from: <strong className="text-brand-700">{activeStore?.name}</strong>
          </span>
          <span className="text-neutral-400 hidden sm:inline">•</span>
          <span className="text-neutral-500 hidden sm:inline">
            Location: {deliveryLocation}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {servedBy && (
            <span className="text-[10px] font-mono font-bold bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md border border-neutral-200">
              Served by: {servedBy}
            </span>
          )}
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
              isCached
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-blue-100 text-blue-800 border border-blue-200'
            }`}
          >
            {isCached ? '⚡ Redis Cache HIT' : '🔄 Primary DB Fetch'}
          </span>
        </div>
      </div>

      {/* Products Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
              {searchQuery ? (
                <>Search results for "{searchQuery}"</>
              ) : selectedCategory ? (
                <>Category: {categories.find((c) => c.slug === selectedCategory)?.name || selectedCategory}</>
              ) : (
                <>
                  <TrendingUp className="w-5 h-5 text-brand-600" />
                  Popular & Daily Essentials
                </>
              )}
            </h2>
            <p className="text-xs text-neutral-500">
              Showing {products.length} products with live store stock
            </p>
          </div>
        </div>

        {/* Loading Skeleton */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-white rounded-3xl border border-neutral-200 p-4 space-y-3 animate-pulse">
                <div className="w-full aspect-square bg-neutral-200 rounded-2xl" />
                <div className="h-3 bg-neutral-200 rounded-md w-2/3" />
                <div className="h-4 bg-neutral-200 rounded-md w-full" />
                <div className="h-6 bg-neutral-200 rounded-xl w-1/2" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-neutral-200 space-y-3">
            <Search className="w-12 h-12 text-neutral-300 mx-auto" />
            <h3 className="text-base font-bold text-neutral-800">No products found</h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              We couldn't find any items matching your filters. Try clearing your search or browsing another category.
            </p>
            <button
              onClick={handleClearFilter}
              className="px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-brand-700 transition-colors"
            >
              View All Products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={onSelectProduct}
              />
            ))}
          </div>
        )}
      </section>

    </div>
  );
};
