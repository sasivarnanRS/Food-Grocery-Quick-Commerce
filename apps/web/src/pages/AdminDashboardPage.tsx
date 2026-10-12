import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Package,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { IProduct, ICategory, IStore } from '@quickcommerce/shared-types';
import { useAuth } from '../context/AuthContext';

export const AdminDashboardPage: React.FC = () => {
  const { user, loginDemo } = useAuth();
  const [products, setProducts] = useState<IProduct[]>([]);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [stores, setStores] = useState<IStore[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Product Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [image, setImage] = useState('');
  const [price, setPrice] = useState(100);
  const [discount, setDiscount] = useState(10);
  const [unit, setUnit] = useState('500 g');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, catRes, storeRes] = await Promise.all([
        apiClient.get('/products?limit=100'),
        apiClient.get('/categories'),
        apiClient.get('/stores'),
      ]);
      setProducts(prodRes.data.data || []);
      setCategories(catRes.data.data || []);
      setStores(storeRes.data.data || []);
      if (catRes.data.data?.length > 0 && !categoryId) {
        setCategoryId(catRes.data.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/products', {
        name,
        description,
        categoryId,
        image,
        price: Number(price),
        discount: Number(discount),
        unit,
      });
      setShowAddModal(false);
      setName('');
      setDescription('');
      setImage('');
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create product');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Header */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-neutral-900 text-white flex items-center justify-center font-bold shadow-md">
            <ShieldCheck className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-neutral-900">Admin Catalog & Inventory</h1>
              <span className="text-[10px] font-extrabold uppercase bg-neutral-100 text-neutral-800 px-2.5 py-0.5 rounded-full">
                Operations
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Active Admin: {user?.name || 'Unauthenticated'} ({user?.email || 'N/A'}) • Role: {user?.role || 'NONE'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user?.role !== 'ADMIN' && (
            <button
              onClick={() => loginDemo('ADMIN')}
              className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              ⚡ Switch to Admin Demo Account
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-brand-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Catalog Table */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-neutral-900">
            Active Catalog Products ({products.length})
          </h2>
          <span className="text-xs text-neutral-500 font-mono">
            {stores.length} Connected Stores
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-400 font-semibold uppercase tracking-wider border-b border-neutral-100">
              <tr>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Unit</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">Discount</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {products.map((prod) => (
                <tr key={prod.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="py-3 px-4 flex items-center gap-3">
                    <img src={prod.image} alt={prod.name} className="w-9 h-9 object-cover rounded-lg bg-neutral-100" />
                    <span className="font-bold text-neutral-900">{prod.name}</span>
                  </td>
                  <td className="py-3 px-4 text-neutral-600 font-medium">{prod.categoryName || 'General'}</td>
                  <td className="py-3 px-4 text-neutral-500 font-mono">{prod.unit}</td>
                  <td className="py-3 px-4 font-bold text-neutral-900">₹{prod.price}</td>
                  <td className="py-3 px-4 text-emerald-600 font-bold">{prod.discount}%</td>
                  <td className="py-3 px-4">
                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md text-[10px] font-bold">
                      ACTIVE
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-neutral-900/50 backdrop-blur-xs" />
          <div className="relative bg-white rounded-3xl border border-neutral-200 shadow-2xl w-full max-w-lg p-6 z-10 space-y-4">
            <h3 className="text-base font-bold text-neutral-900">Add New Grocery Product</h3>
            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Organic Strawberries"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-neutral-700 mb-1">Description</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Fresh juicy organic strawberries from Mahabaleshwar."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Unit Weight/Size</label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Discount (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-neutral-700 mb-1">Image URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://images.unsplash.com/..."
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-neutral-200 rounded-xl text-neutral-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
